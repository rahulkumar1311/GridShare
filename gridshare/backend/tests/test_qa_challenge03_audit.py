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
