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
