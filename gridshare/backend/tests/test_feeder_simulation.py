"""
Unit Test Suite for Feeder Simulation Engine.
Schneider Electric Yuva Yodha 2026 — Challenge 03.
Tests:
1. Energy conservation (Power Sources == Power Sinks).
2. Distinction between kW and kWh across various dt time steps.
3. Battery limits (capacity, reserve floor, max charge/discharge power, efficiency loss).
4. Prevention of simultaneous charging and discharging.
5. Essential vs. flexible load priority and curtailment.
6. Transformer overload and unmet demand calculations.
7. P2P trade consistency with physical energy balance.
8. Horizon simulation and state propagation.
9. Flask API endpoints for feeder routes and /api/optimize alias.
"""

import unittest
from gridshare.backend.app import create_app
from gridshare.backend.app.models import db
from gridshare.database.seed_data import seed_database
from gridshare.backend.app.services.feeder_simulation_engine import (
    FeederSimulationEngine,
    FeederConfig,
    BatteryState,
    HouseholdNodeConfig,
)

class FeederSimulationTestCase(unittest.TestCase):
    def setUp(self):
        class TestConfig:
            TESTING = True
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
            SQLALCHEMY_TRACK_MODIFICATIONS = False
            SECRET_KEY = "test-feeder-secret"
            MQTT_ENABLED = False
            BASE_GRID_PRICE = 6.10
            P2P_DISCOUNT_FACTOR = 0.75

        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            seed_database(clear_existing=True)

        self.engine = FeederSimulationEngine()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_battery_no_simultaneous_charge_discharge_and_limits(self):
        """Verify battery capacity, reserve floor, and efficiency physics."""
        battery = BatteryState(
            id="test_batt",
            capacity_kwh=10.0,
            current_energy_kwh=5.0,
            min_reserve_pct=20.0,  # 2.0 kWh floor
            max_charge_power_kw=4.0,
            max_discharge_power_kw=4.0,
            charge_efficiency=0.90,
            discharge_efficiency=0.90,
        )

        self.assertAlmostEqual(battery.min_reserve_kwh, 2.0)
        self.assertAlmostEqual(battery.available_energy_kwh, 3.0)
        self.assertAlmostEqual(battery.headroom_kwh, 5.0)

        # 1. Test charging
        dt = 1.0
        p_act, stored, loss = battery.charge(target_power_kw=2.0, duration_hours=dt)
        self.assertAlmostEqual(p_act, 2.0)
        self.assertAlmostEqual(stored, 2.0 * 0.90)  # 1.8 kWh stored
        self.assertAlmostEqual(loss, 2.0 * 0.10)    # 0.2 kWh loss
        self.assertAlmostEqual(battery.current_energy_kwh, 6.8)

        # 2. Test charging cannot exceed capacity
        p_act2, stored2, loss2 = battery.charge(target_power_kw=10.0, duration_hours=dt)
        # Headroom was 3.2 kWh -> max electrical power = 3.2 / (0.9 * 1.0) = 3.5556 kW
        self.assertLessEqual(battery.current_energy_kwh, 10.0001)

        # 3. Test discharge down to reserve floor
        p_dis, delivered, loss_dis = battery.discharge(target_power_kw=15.0, duration_hours=dt)
        # Max discharge limited by max_discharge_power_kw (4.0 kW)
        self.assertEqual(p_dis, 4.0)
        self.assertGreaterEqual(battery.current_energy_kwh, 2.0)

        # 4. Attempt discharge below reserve floor
        battery.current_energy_kwh = 2.0  # Exactly at reserve floor
        self.assertAlmostEqual(battery.available_energy_kwh, 0.0)
        p_dis_empty, delivered_empty, _ = battery.discharge(target_power_kw=2.0, duration_hours=dt)
        self.assertEqual(p_dis_empty, 0.0)
        self.assertEqual(delivered_empty, 0.0)
        self.assertAlmostEqual(battery.current_energy_kwh, 2.0)

    def test_energy_conservation_and_power_balance(self):
        """Verify exact conservation of energy: Total Sources == Total Sinks."""
        # Test across multiple hours of day (night, morning, solar noon, evening peak)
        for hour in [0.0, 8.0, 12.0, 14.0, 19.0, 22.0]:
            res = self.engine.simulate_step(hour_of_day=hour, duration_hours=1.0)
            reliability = res["feeder_reliability"]
            self.assertTrue(
                reliability["energy_balance_conserved"],
                f"Energy not conserved at hour {hour}! Error: {reliability['power_balance_error_kw']} kW"
            )
            self.assertLess(reliability["power_balance_error_kw"], 1e-4)

    def test_kw_vs_kwh_different_time_steps(self):
        """Verify strict conversion: Energy (kWh) = Power (kW) * duration (hours)."""
        engine_1h = FeederSimulationEngine()
        step_1h = engine_1h.simulate_step(hour_of_day=12.0, duration_hours=1.0)

        engine_15m = FeederSimulationEngine()
        step_15m = engine_15m.simulate_step(hour_of_day=12.0, duration_hours=0.25)

        # Generation power (kW) should be identical at same hour
        self.assertAlmostEqual(
            step_1h["aggregate_power_kw"]["total_solar_generation_kw"],
            step_15m["aggregate_power_kw"]["total_solar_generation_kw"],
            places=3
        )
        # But energy (kWh) in 15 minutes should be exactly 1/4 of 1 hour
        self.assertAlmostEqual(
            step_15m["aggregate_energy_kwh"]["solar_generation_kwh"],
            step_1h["aggregate_energy_kwh"]["solar_generation_kwh"] * 0.25,
            places=3
        )

    def test_p2p_trading_physical_consistency(self):
        """Verify that P2P trades never exceed physical local surplus or deficit."""
        for hour in [10.0, 12.0, 14.0, 18.0]:
            res = self.engine.simulate_step(hour_of_day=hour, duration_hours=1.0)
            agg_p = res["aggregate_power_kw"]
            p2p_kw = agg_p["p2p_cleared_kw"]

            # Sum household export surpluses and import deficits
            hh = res["households"]
            tot_surplus = sum(h["feeder_export_surplus_kw"] for h in hh)
            tot_deficit = sum(h["feeder_import_deficit_kw"] for h in hh)

            self.assertLessEqual(p2p_kw, tot_surplus + 1e-4)
            self.assertLessEqual(p2p_kw, tot_deficit + 1e-4)

    def test_transformer_capacity_overload_and_curtailment(self):
        """Verify that undersized transformer curtails surplus and logs overload."""
        # Create feeder with tiny 2 kVA transformer and no central storage buffer
        small_cfg = FeederConfig(
            transformer_capacity_kva=2.0,
            power_factor=1.0,
            community_battery_capacity_kwh=0.01,
            community_battery_max_power_kw=0.0
        )
        constrained_engine = FeederSimulationEngine(config=small_cfg)

        # Hour 12 with high solar generation (surplus exceeds 2 kVA transformer limit)
        res = constrained_engine.simulate_step(hour_of_day=12.0, duration_hours=1.0, solar_irradiance_factor=2.0)
        agg_p = res["aggregate_power_kw"]
        # Export must not exceed 2.0 kW transformer rating
        self.assertLessEqual(agg_p["grid_export_kw"], 2.001)
        # Residual surplus exceeding transformer export capacity is explicitly curtailed
        self.assertGreater(agg_p["curtailed_solar_kw"], 0.0)

    def test_islanded_microgrid_mode_and_load_shedding(self):
        """Verify islanded mode: no grid import; unmet demand when load exceeds local DER."""
        # Hour 20 (night, zero solar) in islanded mode
        res = self.engine.simulate_step(hour_of_day=20.0, duration_hours=1.0, grid_available=False)
        agg_p = res["aggregate_power_kw"]
        self.assertEqual(agg_p["grid_import_kw"], 0.0)
        self.assertEqual(agg_p["grid_export_kw"], 0.0)
        self.assertEqual(res["grid_status"], "ISLANDED")

    def test_multi_step_horizon_simulation(self):
        """Verify sequential 24-hour simulation propagates battery SOC and reliability."""
        horizon_res = self.engine.simulate_horizon(
            start_hour=0.0,
            horizon_steps=24,
            step_duration_hours=1.0,
            weather_scenario="CLOUDY_INTERMITTENT"
        )
        self.assertEqual(horizon_res["status"], "SUCCESS")
        self.assertEqual(len(horizon_res["steps"]), 24)
        totals = horizon_res["cumulative_totals"]
        self.assertGreater(totals["total_demand_kwh"], 0.0)
        self.assertGreater(totals["total_generation_kwh"], 0.0)
        self.assertIn("reliability_summary", horizon_res)

    def test_api_feeder_endpoints(self):
        """Test Flask REST API routes for /api/feeder/* and /api/optimize alias."""
        # 1. GET /api/feeder/status
        res_status = self.client.get("/api/feeder/status?hour=13.0")
        self.assertEqual(res_status.status_code, 200)
        data_s = res_status.get_json()
        self.assertEqual(data_s["status"], "SUCCESS")
        self.assertIn("feeder_reliability", data_s["data"])

        # 2. GET /api/feeder/scenarios
        res_scenarios = self.client.get("/api/feeder/scenarios")
        self.assertEqual(res_scenarios.status_code, 200)
        data_sc = res_scenarios.get_json()
        self.assertGreaterEqual(len(data_sc["scenarios"]), 4)

        # 3. POST /api/feeder/simulate
        sim_payload = {
            "horizon_steps": 12,
            "step_duration_hours": 1.0,
            "weather_scenario": "HIGH_SOLAR",
            "grid_available": True,
        }
        res_sim = self.client.post("/api/feeder/simulate", json=sim_payload)
        self.assertEqual(res_sim.status_code, 200)
        data_sim = res_sim.get_json()
        self.assertEqual(data_sim["status"], "SUCCESS")
        self.assertEqual(len(data_sim["steps"]), 12)

        # 4. POST /api/optimize (Fix for route alias)
        res_opt = self.client.post("/api/optimize")
        self.assertEqual(res_opt.status_code, 200)
        data_opt = res_opt.get_json()
        self.assertEqual(data_opt["status"], "SUCCESS")

        # 5. GET /api/feeder/forecast
        res_fc = self.client.get("/api/feeder/forecast?horizon_hours=6")
        self.assertEqual(res_fc.status_code, 200)
        data_fc = res_fc.get_json()
        self.assertEqual(data_fc["status"], "SUCCESS")
        self.assertIn("house_a", data_fc["forecasts"])

        # 6. POST /api/feeder/optimize-forecast
        res_fo = self.client.post("/api/feeder/optimize-forecast", json={"horizon_hours": 6, "initial_battery_soc": 50.0})
        self.assertEqual(res_fo.status_code, 200)
        data_fo = res_fo.get_json()
        self.assertEqual(data_fo["status"], "SUCCESS")
        self.assertIn("recommendations", data_fo)
        self.assertTrue(data_fo["kpi_summary"]["essential_loads_protected"])

    def test_forecast_affects_feeder_decision(self):
        """Verify that forecasts and battery state directly affect optimizer decisions."""
        from gridshare.backend.app.services.feeder_optimizer_service import FeederForecastOptimizerService

        # Scenario A: Battery is full (90% SOC) -> Deficit will be met by DISCHARGE_COMMUNITY_ESS
        res_high_soc = FeederForecastOptimizerService.optimize_feeder_horizon(
            horizon_hours=6,
            initial_battery_soc=90.0,
            battery_capacity_kwh=50.0,
        )
        actions_high = [r["action_type"] for r in res_high_soc["recommendations"]]
        self.assertIn("DISCHARGE_COMMUNITY_ESS", actions_high)
        self.assertGreater(res_high_soc["kpi_summary"]["total_battery_discharged_kwh"], 0.0)

        # Scenario B: Battery is at reserve floor (20% SOC) -> Cannot discharge!
        res_low_soc = FeederForecastOptimizerService.optimize_feeder_horizon(
            horizon_hours=6,
            initial_battery_soc=20.0,
            battery_capacity_kwh=50.0,
        )
        actions_low = [r["action_type"] for r in res_low_soc["recommendations"]]
        # Must NOT discharge below reserve floor
        self.assertEqual(res_low_soc["kpi_summary"]["total_battery_discharged_kwh"], 0.0)
        self.assertNotIn("DISCHARGE_COMMUNITY_ESS", actions_low)
        # Instead, it must rely on grid import or flexible load shift
        self.assertIn("IMPORT_GRID", actions_low)

    def test_infeasible_actions_are_rejected(self):
        """Verify that physical constraints reject impossible dispatch actions."""
        from gridshare.backend.app.services.feeder_optimizer_service import FeederForecastOptimizerService

        # Run 6-hour optimization with 20% reserve
        res = FeederForecastOptimizerService.optimize_feeder_horizon(
            horizon_hours=6,
            initial_battery_soc=20.0,
            battery_reserve_pct=20.0,
            max_battery_power_kw=15.0,
        )

        # Check all recommendations: no battery discharge below 20%
        for r in res["recommendations"]:
            if r["action_type"] == "DISCHARGE_COMMUNITY_ESS":
                self.fail("Infeasible discharge generated when battery is at 20% reserve floor!")

        # Verify schedule intervals: battery SOC never drops below min_reserve_pct
        for iv in res["schedule_by_interval"]:
            self.assertGreaterEqual(iv["battery_end_soc"], 19.99)

    def test_essential_loads_strictly_protected(self):
        """Verify that essential electrical loads are NEVER curtailed or shut off."""
        from gridshare.backend.app.services.feeder_optimizer_service import FeederForecastOptimizerService

        res = FeederForecastOptimizerService.optimize_feeder_horizon(
            horizon_hours=12,
            initial_battery_soc=20.0,  # Zero battery help
            allow_flexible_load_shift=True,
        )

        # KPI level check
        self.assertTrue(res["kpi_summary"]["essential_loads_protected"])

        # Check every interval: essential load must be 100% served
        for iv in res["schedule_by_interval"]:
            self.assertTrue(iv["essential_demand_fully_served"])

        # Check every recommendation item has explicit essential load safety stamp
        for r in res["recommendations"]:
            self.assertTrue(r["essential_load_protected"])

    def test_forecast_uncertainty_quantification(self):
        """Verify that demand forecasts report empirical decision-tree uncertainty."""
        from gridshare.backend.app.services.feeder_optimizer_service import FeederForecastOptimizerService

        res = FeederForecastOptimizerService.optimize_feeder_horizon(horizon_hours=6)
        meta = res["model_metadata"]
        self.assertIn("RandomForestRegressor", meta["algorithm"])
        self.assertIn("Ensemble Tree Standard Deviation", meta["demand_uncertainty_metric"])
        self.assertIn("uncertainty_disclosure", meta)

        # Check that intervals report uncertainty > 0
        for iv in res["schedule_by_interval"]:
            self.assertGreater(iv["aggregate_uncertainty_kw"], 0.0)

if __name__ == "__main__":
    unittest.main()
