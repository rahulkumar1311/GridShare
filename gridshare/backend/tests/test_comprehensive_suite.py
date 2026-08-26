import unittest
import datetime
from gridshare.backend.app import create_app
from gridshare.backend.app.models import (
    db,
    Household,
    EnergyReading,
    Battery,
    EnergyTransaction,
    OptimizationDecision,
    Prediction,
    MarketOffer,
    MarketRequest,
)
from gridshare.database.seed_data import seed_database
from gridshare.backend.app.services.community_state_service import CommunityStateService
from gridshare.backend.app.services.rule_optimizer import RuleBasedOptimizer
from gridshare.backend.app.services.marketplace_service import MarketplaceService
from gridshare.backend.app.services.prediction_service import PredictionService
from gridshare.simulator.generator import TelemetryGenerator, HOUSEHOLD_PROFILES

class ComprehensiveGridShareTestSuite(unittest.TestCase):
    def setUp(self):
        class TestConfig:
            TESTING = True
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
            SQLALCHEMY_TRACK_MODIFICATIONS = False
            SECRET_KEY = "test-secret-key"
            MQTT_ENABLED = False
            BASE_GRID_PRICE = 6.10
            P2P_DISCOUNT_FACTOR = 0.75

        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            seed_database(clear_existing=True)

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    # ==========================================
    # 1. DATABASE & MODEL INTEGRITY TESTS
    # ==========================================
    def test_database_crud_and_relationships(self):
        """Test creating, reading, updating and deleting database entities."""
        with self.app.app_context():
            house = db.session.get(Household, "house_a")
            self.assertIsNotNone(house)
            self.assertEqual(house.household_type, "PROSUMER")

            bat = Battery.query.filter_by(community_id="green_enclave_cluster").first()
            self.assertIsNotNone(bat)
            self.assertEqual(bat.capacity_kwh, 50.0)
            self.assertEqual(bat.current_soc, 40.0)

            reading = EnergyReading(
                household_id="house_a",
                timestamp=datetime.datetime.now(datetime.timezone.utc),
                generation_kw=7.5,
                consumption_kw=1.8,
                battery_soc=90.0,
                grid_price=6.10,
                source="SIMULATED",
            )
            db.session.add(reading)
            db.session.commit()
            self.assertIsNotNone(reading.id)
            self.assertEqual(reading.source, "SIMULATED")

    # ==========================================
    # 2. EDGE CASE 1 & 2: ZERO GENERATION & ZERO CONSUMPTION
    # ==========================================
    def test_edge_case_zero_generation(self):
        """Edge Case 1: Night-time condition where generation is 0.0 kW."""
        res = CommunityStateService.classify_household_energy(generation_kw=0.0, consumption_kw=3.5)
        self.assertEqual(res["status"], "DEFICIT")
        self.assertEqual(res["net_energy_kw"], -3.5)

    def test_edge_case_zero_consumption(self):
        """Edge Case 2: Vacant solar home where consumption is 0.0 kW."""
        res = CommunityStateService.classify_household_energy(generation_kw=5.0, consumption_kw=0.0)
        self.assertEqual(res["status"], "SURPLUS")
        self.assertEqual(res["net_energy_kw"], 5.0)

    # ==========================================
    # 3. EDGE CASE 3 & 4: NO SURPLUS & NO DEFICIT
    # ==========================================
    def test_edge_case_no_surplus(self):
        """Edge Case 3: Grid condition where surplus is exactly 0.0 kW."""
        res = RuleBasedOptimizer.allocate_energy(
            surplus_kw=0.0,
            deficit_kw=3.5,
            battery_soc=40.0,
            battery_capacity_kwh=50.0,
            battery_min_reserve=20.0,
        )
        alloc = res["summary_allocation"]
        self.assertEqual(alloc["local_trade_kw"], 0.0)
        self.assertEqual(alloc["battery_allocation_kw"], 0.0)
        self.assertEqual(alloc["grid_export_kw"], 0.0)
        self.assertEqual(alloc["battery_discharge_kw"], 3.5)

    def test_edge_case_no_deficit(self):
        """Edge Case 4: Grid condition where community deficit is 0.0 kW."""
        res = RuleBasedOptimizer.allocate_energy(
            surplus_kw=4.0,
            deficit_kw=0.0,
            battery_soc=40.0,
            battery_capacity_kwh=50.0,
        )
        alloc = res["summary_allocation"]
        self.assertEqual(alloc["local_trade_kw"], 0.0)
        self.assertEqual(alloc["battery_allocation_kw"], 4.0)
        self.assertEqual(alloc["grid_export_kw"], 0.0)

    # ==========================================
    # 4. EDGE CASE 5 & 6: BATTERY FULL & BATTERY AT RESERVE FLOOR
    # ==========================================
    def test_edge_case_battery_full(self):
        """Edge Case 5: Battery at 100% SOC cannot buffer further, residual exported to grid."""
        res = RuleBasedOptimizer.allocate_energy(
            surplus_kw=5.0,
            deficit_kw=1.5,
            battery_soc=100.0,
            battery_capacity_kwh=50.0,
        )
        alloc = res["summary_allocation"]
        self.assertEqual(alloc["local_trade_kw"], 1.5)
        self.assertEqual(alloc["battery_allocation_kw"], 0.0)
        self.assertEqual(alloc["grid_export_kw"], 3.5)

    def test_edge_case_battery_at_reserve(self):
        """Edge Case 6: Battery at 20% reserve cannot discharge, deficit satisfied by utility grid."""
        res = RuleBasedOptimizer.allocate_energy(
            surplus_kw=0.0,
            deficit_kw=4.0,
            battery_soc=20.0,
            battery_capacity_kwh=50.0,
            battery_min_reserve=20.0,
        )
        alloc = res["summary_allocation"]
        self.assertEqual(alloc["battery_discharge_kw"], 0.0)
        self.assertEqual(alloc["grid_import_kw"], 4.0)

    # ==========================================
    # 5. EDGE CASE 7: NO TRADE POSSIBLE (PRICE INCOMPATIBILITY)
    # ==========================================
    def test_edge_case_no_trade_possible(self):
        """Edge Case 7: Seller min ask (6.50) > Buyer max bid (4.00) -> 0 matches cleared."""
        with self.app.app_context():
            db.session.query(MarketOffer).delete()
            db.session.query(MarketRequest).delete()
            db.session.commit()

            MarketplaceService.create_offer(household_id="house_a", energy_kwh=5.0, min_price_per_kwh=6.50)
            MarketplaceService.create_request(household_id="house_b", energy_kwh=3.0, max_price_per_kwh=4.00)

            result = MarketplaceService.match_orders(auto_sync_if_empty=False)
            self.assertEqual(result["transactions_count"], 0)
            self.assertEqual(len(result["transactions"]), 0)

    # ==========================================
    # 6. EDGE CASE 8: MULTIPLE SELLERS (COMPETITIVE BIDDING)
    # ==========================================
    def test_edge_case_multiple_sellers(self):
        """Edge Case 8: Multiple prosumer sellers cleared in order of lowest ask tariff."""
        with self.app.app_context():
            db.session.query(MarketOffer).delete()
            db.session.query(MarketRequest).delete()
            db.session.commit()

            # Seller A asks 4.20, Seller E asks 3.90 (Cheaper)
            MarketplaceService.create_offer(household_id="house_a", energy_kwh=2.0, min_price_per_kwh=4.20)
            MarketplaceService.create_offer(household_id="house_e", energy_kwh=2.0, min_price_per_kwh=3.90)
            # Buyer B wants 3.0 kWh at up to 5.00
            MarketplaceService.create_request(household_id="house_b", energy_kwh=3.0, max_price_per_kwh=5.00)

            result = MarketplaceService.match_orders(auto_sync_if_empty=False)
            self.assertEqual(result["transactions_count"], 2)
            tx1 = result["transactions"][0]
            self.assertEqual(tx1["seller_household_id"], "house_e")
            self.assertEqual(tx1["energy_kwh"], 2.0)
            tx2 = result["transactions"][1]
            self.assertEqual(tx2["seller_household_id"], "house_a")
            self.assertEqual(tx2["energy_kwh"], 1.0)

    # ==========================================
    # 7. EDGE CASE 9: MULTIPLE BUYERS (DEMAND AGGREGATION)
    # ==========================================
    def test_edge_case_multiple_buyers(self):
        """Edge Case 9: Single large seller cleared across multiple competing consumer buyers."""
        with self.app.app_context():
            db.session.query(MarketOffer).delete()
            db.session.query(MarketRequest).delete()
            db.session.commit()

            MarketplaceService.create_offer(household_id="house_a", energy_kwh=5.0, min_price_per_kwh=4.00)
            MarketplaceService.create_request(household_id="house_b", energy_kwh=2.5, max_price_per_kwh=5.20)
            MarketplaceService.create_request(household_id="house_d", energy_kwh=2.5, max_price_per_kwh=4.80)

            result = MarketplaceService.match_orders(auto_sync_if_empty=False)
            self.assertEqual(result["transactions_count"], 2)
            self.assertAlmostEqual(result["total_energy_cleared_kwh"], 5.0, places=2)

    # ==========================================
    # 8. REST API INTEGRATION & ROUTE TESTS
    # ==========================================
    def test_api_routes_health_and_summary(self):
        """Test health, dashboard summary, and live energy endpoints."""
        r_health = self.client.get("/api/health")
        self.assertEqual(r_health.status_code, 200)
        self.assertEqual(r_health.get_json()["status"], "healthy")

        r_dash = self.client.get("/api/dashboard/summary")
        self.assertEqual(r_dash.status_code, 200)
        self.assertIn("energy_summary", r_dash.get_json()["data"])

        r_live = self.client.get("/api/energy/live")
        self.assertEqual(r_live.status_code, 200)

    def test_api_telemetry_ingest_and_observe(self):
        """Test telemetry POST and observe GET."""
        payload = {
            "household_id": "house_a",
            "generation_kw": 6.8,
            "consumption_kw": 2.1,
            "battery_soc": 85.0,
            "grid_price": 6.10,
            "source": "SIMULATED",
        }
        r_tel = self.client.post("/api/telemetry", json=payload)
        self.assertEqual(r_tel.status_code, 201)

        r_obs = self.client.get("/api/observe/state")
        self.assertEqual(r_obs.status_code, 200)
        data = r_obs.get_json()["data"]
        self.assertIn("summary", data)

    def test_api_prediction_and_optimization(self):
        """Test ML prediction run and rule optimizer endpoints."""
        r_pred = self.client.post("/api/predictions/run")
        self.assertEqual(r_pred.status_code, 200)

        r_opt = self.client.post("/api/optimization/run")
        self.assertEqual(r_opt.status_code, 200)
        opt_data = r_opt.get_json()
        self.assertEqual(opt_data["engine_type"], "DETERMINISTIC_RULE_BASED")

    def test_api_demo_scenario_and_reset(self):
        """Test Hackathon Demo Scenario run and reset endpoints."""
        r_demo = self.client.post("/api/demo/run-scenario")
        self.assertEqual(r_demo.status_code, 200)
        demo_json = r_demo.get_json()
        self.assertEqual(demo_json["scenario"], "SUNNY_AFTERNOON_COMMUNITY")
        alloc = demo_json["allocation_results"]
        self.assertEqual(alloc["local_trade_kw"], 2.80)
        self.assertEqual(alloc["battery_allocation_kw"], 1.20)
        self.assertEqual(alloc["grid_export_kw"], 0.70)

        r_reset = self.client.post("/api/demo/reset")
        self.assertEqual(r_reset.status_code, 200)
        self.assertEqual(r_reset.get_json()["status"], "SUCCESS")

    # ==========================================
    # 9. SIMULATOR GENERATOR & PUBLISHER TESTS
    # ==========================================
    def test_simulator_telemetry_generation(self):
        """Test diurnal generation, load simulation, and PPT mode."""
        gen = TelemetryGenerator(base_price=6.10)
        for hid in HOUSEHOLD_PROFILES.keys():
            reading = gen.generate_live_reading(household_id=hid)
            self.assertEqual(reading["source"], "SIMULATED")
            self.assertGreaterEqual(reading["generation_kw"], 0.0)
            self.assertGreater(reading["consumption_kw"], 0.0)

        ppt_data = gen.generate_ppt_scenario()
        self.assertEqual(len(ppt_data), 5)
        house_a = next(d for d in ppt_data if d["household_id"] == "house_a")
        house_b = next(d for d in ppt_data if d["household_id"] == "house_b")
        self.assertEqual(house_a["generation_kw"], 6.80)
        self.assertEqual(house_a["consumption_kw"], 2.10)
        self.assertEqual(house_b["generation_kw"], 1.20)
        self.assertEqual(house_b["consumption_kw"], 4.00)

if __name__ == "__main__":
    unittest.main()
