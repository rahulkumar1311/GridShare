"""
Automated Unit Tests for Reproducible Feeder Baseline vs GridShare Evaluation.

Schneider Electric Yuva Yodha 2026 — Challenge 03: Grid Reliability & Renewable Intermittency.
"""

import unittest
from gridshare.backend.app.services.feeder_evaluation_service import (
    FeederEvaluationService,
    ScenarioDefinition,
)


class TestFeederEvaluation(unittest.TestCase):
    """
    Test suite verifying mathematical rigor, physical conservation,
    zero-denominator handling, and deterministic reproducibility.
    """

    def test_deterministic_reproducibility(self):
        """
        Verify that identical deterministic inputs generate identical outputs
        across repeated runs (no stochastic jitter or state leakage).
        """
        scenarios = FeederEvaluationService.get_standard_scenarios()
        s1 = scenarios[0]

        run1 = FeederEvaluationService.run_scenario_evaluation(s1)
        run2 = FeederEvaluationService.run_scenario_evaluation(s1)

        b1 = run1["baseline"]["metrics"]
        b2 = run2["baseline"]["metrics"]
        g1 = run1["gridshare"]["metrics"]
        g2 = run2["gridshare"]["metrics"]

        # Exact equality on floating point values
        for key in ["peak_grid_import_kw", "total_grid_import_kwh", "estimated_energy_cost_inr", "renewable_self_consumption_ratio"]:
            self.assertEqual(b1[key], b2[key], f"Baseline {key} failed reproducibility check")
            self.assertEqual(g1[key], g2[key], f"GridShare {key} failed reproducibility check")

    def test_energy_conservation_residual(self):
        """
        Verify that energy conservation (Sources == Sinks) holds across all 6 scenarios
        with residual error < 1e-6 kW.
        """
        suite = FeederEvaluationService.run_full_evaluation_suite()
        for res in suite["scenario_results"]:
            sc_id = res["scenario"]["id"]
            b_res = res["baseline"]["metrics"]["energy_balance_residual_kw"]
            g_res = res["gridshare"]["metrics"]["energy_balance_residual_kw"]
            self.assertLess(b_res, 1e-6, f"Baseline residual violated in {sc_id}: {b_res}")
            self.assertLess(g_res, 1e-6, f"GridShare residual violated in {sc_id}: {g_res}")

    def test_zero_denominator_safe_handling(self):
        """
        Verify that Scenario 6 (zero solar generation) safely handles division by zero
        without raising ZeroDivisionError and sets renewable_self_consumption_ratio to 0.0.
        """
        scenarios = FeederEvaluationService.get_standard_scenarios()
        s6 = [s for s in scenarios if s.scenario_id == "scenario_6_unmet_demand"][0]

        res = FeederEvaluationService.run_scenario_evaluation(s6)
        b_ratio = res["baseline"]["metrics"]["renewable_self_consumption_ratio"]
        g_ratio = res["gridshare"]["metrics"]["renewable_self_consumption_ratio"]

        self.assertEqual(b_ratio, 0.0)
        self.assertEqual(g_ratio, 0.0)

    def test_scenario_6_insufficient_resources_unmet_demand(self):
        """
        Verify that Scenario 6 (severe deficit exceeding transformer limit)
        truthfully reports unmet demand > 0 (does not invent power),
        while GridShare protects essential loads.
        """
        scenarios = FeederEvaluationService.get_standard_scenarios()
        s6 = [s for s in scenarios if s.scenario_id == "scenario_6_unmet_demand"][0]

        res = FeederEvaluationService.run_scenario_evaluation(s6)
        bm = res["baseline"]["metrics"]
        gm = res["gridshare"]["metrics"]

        # Physical unmet demand must exist in both because transformer capacity is strictly 28.5 kW
        self.assertGreater(bm["total_unmet_demand_kwh"], 100.0)
        self.assertGreater(gm["total_unmet_demand_kwh"], 100.0)

        # Baseline indiscriminate shedding hurts essential loads
        self.assertGreater(bm["essential_load_violations"], 0)

        # GridShare prioritizes essential loads: flexible load is shed first,
        # so essential loads experience 0 violations
        self.assertEqual(gm["essential_load_violations"], 0)

    def test_battery_reserve_floor_enforcement(self):
        """
        Verify that community battery never discharges below the 20% reserve floor
        in any scenario.
        """
        suite = FeederEvaluationService.run_full_evaluation_suite()
        for res in suite["scenario_results"]:
            sc_id = res["scenario"]["id"]
            b_viol = res["baseline"]["metrics"]["battery_reserve_violations"]
            g_viol = res["gridshare"]["metrics"]["battery_reserve_violations"]
            self.assertEqual(b_viol, 0, f"Baseline battery violated reserve in {sc_id}")
            self.assertEqual(g_viol, 0, f"GridShare battery violated reserve in {sc_id}")

    def test_peak_shaving_in_evening_peak(self):
        """
        Verify that in Scenario 3 (evening demand peak), GridShare reduces
        peak grid import compared to Baseline.
        """
        scenarios = FeederEvaluationService.get_standard_scenarios()
        s3 = [s for s in scenarios if s.scenario_id == "scenario_3_evening_peak"][0]

        res = FeederEvaluationService.run_scenario_evaluation(s3)
        b_peak = res["baseline"]["metrics"]["peak_grid_import_kw"]
        g_peak = res["gridshare"]["metrics"]["peak_grid_import_kw"]

        self.assertLess(g_peak, b_peak, "GridShare failed to shave peak import in Scenario 3")
        self.assertGreater(b_peak - g_peak, 4.0, "Peak shaving reduction was unexpectedly small")


if __name__ == "__main__":
    unittest.main()
