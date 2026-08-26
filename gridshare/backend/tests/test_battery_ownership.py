import unittest
from gridshare.backend.app import create_app
from gridshare.backend.app.models import (
    db,
    Household,
    Battery,
    BatteryContribution,
    BatteryWithdrawal,
    BatteryLedger,
)
from gridshare.backend.app.services.battery_accounting_service import BatteryAccountingService
from gridshare.backend.app.services.storage_optimization_service import StorageOptimizationService

class TestBatteryOwnershipAccounting(unittest.TestCase):
    def setUp(self):
        class TestConfig:
            TESTING = True
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
            SQLALCHEMY_TRACK_MODIFICATIONS = False
            SECRET_KEY = "test-secret"
            MQTT_ENABLED = False
            BASE_GRID_PRICE = 6.10
            P2P_DISCOUNT_FACTOR = 0.75

        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        # Seed clean households
        h1 = Household(id="house_a", name="House A", location="Plot 101", household_type="PROSUMER")
        h2 = Household(id="house_b", name="House B", location="Plot 102", household_type="CONSUMER")
        h3 = Household(id="house_c", name="House C", location="Plot 103", household_type="PROSUMER")
        h4 = Household(id="house_d", name="House D", location="Plot 104", household_type="CONSUMER")
        h5 = Household(id="house_e", name="House E", location="Plot 105", household_type="PROSUMER")
        db.session.add_all([h1, h2, h3, h4, h5])

        # Initialize battery
        battery = Battery(
            id="community_battery_1",
            community_id="green_enclave_cluster",
            capacity_kwh=50.0,
            current_energy_kwh=0.0,
            current_soc=0.0,
            round_trip_efficiency=0.90,
            min_reserve=20.0,
            minimum_reserve_kwh=10.0,
        )
        db.session.add(battery)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_01_single_household_contribution(self):
        """Test 1: Single household contribution with 90% efficiency."""
        res = BatteryAccountingService.contribute_energy("house_a", 10.0)
        self.assertEqual(res["status"], "SUCCESS")

        contrib = res["contribution"]
        self.assertEqual(contrib["contributed_energy_kwh"], 10.0)
        self.assertEqual(contrib["usable_energy_kwh"], 9.0)
        self.assertEqual(contrib["remaining_credit_kwh"], 9.0)
        self.assertEqual(contrib["loss_kwh"], 1.0)

        battery = BatteryAccountingService.get_or_create_battery()
        self.assertEqual(battery.current_energy_kwh, 10.0)
        self.assertEqual(battery.current_soc, 20.0) # 10/50 = 20%

    def test_02_multiple_household_contributions(self):
        """Test 2: House A (10 kWh) + House B (1 kWh) -> Total 11 kWh stored."""
        BatteryAccountingService.contribute_energy("house_a", 10.0)
        BatteryAccountingService.contribute_energy("house_b", 1.0)

        summary = BatteryAccountingService.get_ownership_summary()
        self.assertEqual(summary["total_active_credits_kwh"], 9.9)

        shares = summary["ownership_shares"]
        self.assertEqual(len(shares), 2)
        self.assertEqual(shares[0]["household_id"], "house_a")
        self.assertEqual(shares[0]["ownership_percent"], 90.91)
        self.assertEqual(shares[1]["household_id"], "house_b")
        self.assertEqual(shares[1]["ownership_percent"], 9.09)

    def test_03_proportional_withdrawal_exact_values(self):
        """
        Test 3: Proportional withdrawal of 5 kWh from 11 kWh pool (9.9 usable credits).
        A: 5 * (10/11) = 4.5455 kWh
        B: 5 * (1/11) = 0.4545 kWh
        """
        # Set min_reserve to 0 for full withdrawal test
        battery = BatteryAccountingService.get_or_create_battery()
        battery.min_reserve = 0.0
        battery.minimum_reserve_kwh = 0.0
        db.session.commit()

        BatteryAccountingService.contribute_energy("house_a", 10.0)
        BatteryAccountingService.contribute_energy("house_b", 1.0)

        w_res = BatteryAccountingService.withdraw_energy(5.0, policy="PROPORTIONAL_OWNERSHIP")
        self.assertEqual(w_res["status"], "SUCCESS")

        allocations = w_res["withdrawal_summary"]["allocations"]
        alloc_a = next(a for a in allocations if a["household_id"] == "house_a")
        alloc_b = next(a for a in allocations if a["household_id"] == "house_b")

        self.assertAlmostEqual(alloc_a["allocated_kwh"], 4.5455, places=3)
        self.assertAlmostEqual(alloc_b["allocated_kwh"], 0.4545, places=3)
        self.assertAlmostEqual(alloc_a["remaining_credit_kwh"], 4.4545, places=3)
        self.assertAlmostEqual(alloc_b["remaining_credit_kwh"], 0.4455, places=3)

        # Invariant: Total allocated equals requested withdrawal exactly
        total_allocated = sum(a["allocated_kwh"] for a in allocations)
        self.assertAlmostEqual(total_allocated, 5.0, places=4)

    def test_04_full_credit_depletion(self):
        """Test 4: Full withdrawal sets contribution status to DEPLETED and leaves zero credit."""
        battery = BatteryAccountingService.get_or_create_battery()
        battery.min_reserve = 0.0
        battery.minimum_reserve_kwh = 0.0
        db.session.commit()

        BatteryAccountingService.contribute_energy("house_a", 5.0) # 4.5 kWh credit
        BatteryAccountingService.withdraw_energy(4.5)

        summary = BatteryAccountingService.get_ownership_summary()
        self.assertAlmostEqual(summary["total_active_credits_kwh"], 0.0, places=3)
        self.assertEqual(summary["ownership_shares"][0]["status"], "DEPLETED")

    def test_05_negative_contribution_rejected(self):
        """Test 5: Reject negative or zero contribution energy."""
        with self.assertRaises(ValueError):
            BatteryAccountingService.contribute_energy("house_a", -5.0)

        with self.assertRaises(ValueError):
            BatteryAccountingService.contribute_energy("house_a", 0.0)

    def test_06_excessive_contribution_beyond_capacity_rejected(self):
        """Test 6: Reject contribution exceeding remaining battery headroom."""
        battery = BatteryAccountingService.get_or_create_battery()
        battery.capacity_kwh = 20.0
        battery.current_energy_kwh = 15.0
        db.session.commit()

        with self.assertRaises(ValueError):
            BatteryAccountingService.contribute_energy("house_a", 10.0) # 15 + 10 = 25 > 20

    def test_07_withdrawal_respects_minimum_reserve_floor(self):
        """Test 7: Battery minimum reserve (e.g. 10 kWh / 20%) prevents over-dispatch."""
        battery = BatteryAccountingService.get_or_create_battery()
        battery.capacity_kwh = 50.0
        battery.min_reserve = 20.0
        battery.minimum_reserve_kwh = 10.0
        db.session.commit()

        BatteryAccountingService.contribute_energy("house_a", 12.0) # Stored = 12.0, Reserve = 10.0, Dispatchable = 2.0

        # Attempt to withdraw 5.0 kWh -> Should be capped at available dispatchable (2.0 kWh)
        w_res = BatteryAccountingService.withdraw_energy(5.0)
        actual = w_res["withdrawal_summary"]["actual_withdrawal_kwh"]
        self.assertEqual(actual, 2.0)

    def test_08_no_household_credit_can_ever_be_negative(self):
        """Test 8: Ensure credit balances remain strictly non-negative after any withdrawal."""
        battery = BatteryAccountingService.get_or_create_battery()
        battery.min_reserve = 0.0
        battery.minimum_reserve_kwh = 0.0
        db.session.commit()

        BatteryAccountingService.contribute_energy("house_a", 2.0)
        BatteryAccountingService.contribute_energy("house_b", 1.0)
        BatteryAccountingService.withdraw_energy(10.0) # Request more than total

        summary = BatteryAccountingService.get_ownership_summary()
        for s in summary["ownership_shares"]:
            self.assertGreaterEqual(s["remaining_credit_kwh"], 0.0)

    def test_09_storage_vs_grid_export_decision_engine(self):
        """Test 9: Storage vs. Grid Export optimization comparison."""
        battery = BatteryAccountingService.get_or_create_battery()
        battery.capacity_kwh = 50.0
        battery.current_energy_kwh = 20.0
        db.session.commit()

        # Evening high demand scenario -> Expect STORE decision
        res_store = StorageOptimizationService.evaluate_storage_vs_export(
            surplus_kwh=4.70,
            current_grid_price=3.50,
            predicted_evening_demand_kw=4.20,
        )
        self.assertEqual(res_store["decision"], "STORE")
        self.assertGreater(res_store["economic_analysis"]["net_storage_benefit_inr"], 0.0)

        # Full battery scenario -> Expect GRID_EXPORT decision
        battery.current_energy_kwh = 50.0
        db.session.commit()

        res_export = StorageOptimizationService.evaluate_storage_vs_export(
            surplus_kwh=4.70,
            current_grid_price=3.50,
            predicted_evening_demand_kw=4.20,
        )
        self.assertEqual(res_export["decision"], "GRID_EXPORT")

    def test_10_immutable_battery_ledger_audit_trail(self):
        """Test 10: Complete immutable ledger entries created for every charge & discharge."""
        battery = BatteryAccountingService.get_or_create_battery()
        battery.min_reserve = 0.0
        battery.minimum_reserve_kwh = 0.0
        db.session.commit()

        BatteryAccountingService.contribute_energy("house_a", 10.0)
        BatteryAccountingService.contribute_energy("house_b", 1.0)
        BatteryAccountingService.withdraw_energy(5.0)

        ledger = BatteryAccountingService.get_ledger()
        self.assertEqual(len(ledger), 3)

        action_types = [e["action_type"] for e in ledger]
        self.assertIn("WITHDRAWAL", action_types)
        self.assertIn("CONTRIBUTION", action_types)

if __name__ == "__main__":
    unittest.main()
