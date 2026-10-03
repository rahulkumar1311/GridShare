"""
Comprehensive QA and Engineering Audit Test Suite for Challenge 03.
Schneider Electric Yuva Yodha 2026 — Grid Reliability & Renewable Intermittency.

Rigorous Verification:
1. Zero solar generation.
2. Demand greater than solar and all available battery support.
3. Full battery with solar surplus.
4. Empty battery at its reserve floor.
5. Battery maximum charge and discharge power limits.
6. Invalid or missing forecast inputs.
7. Flexible loads with scheduling constraints and no double-allocation.
8. Essential loads that cannot be shifted.
9. Time-step boundaries and energy-unit conversion (Energy = Power * dt).
10. Impossible or negative energy states.
11. Identical inputs producing identical outputs (determinism).
12. Existing GridShare routes and features still working.
"""

import unittest
import math
from gridshare.backend.app import create_app, db
from gridshare.backend.app.services.feeder_simulation_engine import (
    FeederSimulationEngine,
    FeederConfig,
    BatteryState,
    HouseholdNodeConfig,
)
from gridshare.backend.app.services.feeder_optimizer_service import (
    FeederForecastOptimizerService,
)
from gridshare.backend.app.services.feeder_evaluation_service import (
    FeederEvaluationService,
    ScenarioDefinition,
)


class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = "test-feeder-secret"
    MQTT_ENABLED = False
    BASE_GRID_PRICE = 6.10
    P2P_DISCOUNT_FACTOR = 0.75

class TestChallenge03Audit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app(TestConfig)
        cls.client = cls.app.test_client()
        with cls.app.app_context():
            db.create_all()

    # 1. Zero solar generation
    def test_01_zero_solar_generation(self):
        engine = FeederSimulationEngine()
        step = engine.simulate_step(
            hour_of_day=12.0,
            solar_irradiance_factor=0.0,
            duration_hours=1.0,
        )
        agg_power = step["aggregate_power_kw"]
        self.assertEqual(agg_power["total_solar_generation_kw"], 0.0)
        self.assertEqual(step["aggregate_energy_kwh"]["solar_generation_kwh"], 0.0)
        self.assertEqual(step["aggregate_power_kw"]["curtailed_solar_kw"], 0.0)
        # Power balance must still strictly hold
        self.assertTrue(step["feeder_reliability"]["energy_balance_conserved"])
        self.assertLess(step["feeder_reliability"]["power_balance_error_kw"], 1e-4)

    # 2. Demand greater than solar and all available battery support
    def test_02_severe_deficit_exceeding_battery(self):
        engine = FeederSimulationEngine(
            config=FeederConfig(
                transformer_capacity_kva=20.0,  # 19 kW max active import
                community_battery_capacity_kwh=10.0,
                community_battery_initial_soc=20.0,  # at reserve floor
            )
        )
        # Heavy load multiplier with zero solar
        step = engine.simulate_step(
            hour_of_day=20.0,
            solar_irradiance_factor=0.0,
            load_multiplier=3.0,  # ~38 kW demand vs 19 kW transformer limit
        )
        agg = step["aggregate_power_kw"]
        self.assertGreater(agg["total_demand_kw"], 30.0)
        self.assertGreater(agg["unmet_demand_kw"], 5.0)
        # Battery was at floor, so discharge must be 0
        self.assertEqual(agg["community_battery_discharge_kw"], 0.0)
        # Grid import must be clamped by transformer rating
        self.assertLessEqual(agg["grid_import_kw"], 20.0 * 0.95 + 1e-4)
        # Power balance strictly preserved even under heavy unmet demand
        self.assertTrue(step["feeder_reliability"]["energy_balance_conserved"])

    # 3. Full battery with solar surplus
    def test_03_full_battery_with_solar_surplus(self):
        engine = FeederSimulationEngine(
            config=FeederConfig(
                community_battery_capacity_kwh=50.0,
                community_battery_initial_soc=100.0,  # 100% full
                community_battery_reserve_pct=20.0,
            )
        )
        step = engine.simulate_step(
            hour_of_day=12.0,
            solar_irradiance_factor=1.5,
            load_multiplier=0.5,
        )
        # Full battery cannot charge further
        self.assertEqual(step["aggregate_power_kw"]["community_battery_charge_kw"], 0.0)
        self.assertLessEqual(step["community_battery"]["soc_pct"], 100.0)
        # Surplus must either export or curtail, not disappear
        self.assertGreater(step["aggregate_power_kw"]["grid_export_kw"], 0.0)
        self.assertTrue(step["feeder_reliability"]["energy_balance_conserved"])

    # 4. Empty battery at its reserve floor
    def test_04_battery_at_reserve_floor_cannot_discharge(self):
        battery = BatteryState(
            id="test_batt",
            capacity_kwh=100.0,
            current_energy_kwh=20.0,  # Exactly at 20%
            min_reserve_pct=20.0,
            max_discharge_power_kw=20.0,
        )
        self.assertEqual(battery.available_energy_kwh, 0.0)
        actual_kw, delivered_kwh, loss = battery.discharge(target_power_kw=15.0, duration_hours=1.0)
        self.assertEqual(actual_kw, 0.0)
        self.assertEqual(delivered_kwh, 0.0)
        self.assertEqual(loss, 0.0)
        self.assertEqual(battery.current_energy_kwh, 20.0)
        self.assertEqual(battery.soc_pct, 20.0)

    # 5. Battery maximum charge and discharge power limits
    def test_05_battery_c_rate_and_inverter_limits(self):
        battery = BatteryState(
            id="test_batt",
            capacity_kwh=100.0,
            current_energy_kwh=50.0,
            min_reserve_pct=20.0,
            max_charge_power_kw=10.0,
            max_discharge_power_kw=12.0,
        )
        # Request 50 kW charge (should clamp to 10 kW)
        ch_p, _, _ = battery.charge(50.0, 1.0)
        self.assertEqual(ch_p, 10.0)

        # Request 50 kW discharge (should clamp to 12 kW)
        dis_p, _, _ = battery.discharge(50.0, 1.0)
        self.assertEqual(dis_p, 12.0)

    # 6. Invalid or missing forecast inputs
    def test_06_invalid_or_missing_forecast_inputs(self):
        # Negative horizon, out of bounds SOC, zero battery capacity
        opt = FeederForecastOptimizerService.optimize_feeder_horizon(
            horizon_hours=-5,  # Invalid
            initial_battery_soc=150.0,  # Out of bounds
            battery_capacity_kwh=-10.0,  # Invalid
            transformer_capacity_kva=-5.0,  # Invalid
        )
        self.assertEqual(opt["status"], "SUCCESS")
        # Horizon must be clamped to at least 1
        self.assertGreaterEqual(opt["horizon_hours"], 1)
        self.assertLessEqual(opt["horizon_hours"], 24)
        self.assertIn("kpi_summary", opt)

    # 7. Flexible loads with scheduling constraints & no double-allocation
    def test_07_flexible_loads_and_no_double_allocation(self):
        opt = FeederForecastOptimizerService.optimize_feeder_horizon(
            horizon_hours=12,
