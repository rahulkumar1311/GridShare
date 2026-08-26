import unittest
import json
from gridshare.backend.app import create_app
from gridshare.backend.app.models import db, Prediction, MarketOffer, MarketRequest, EnergyTransaction
from gridshare.database.seed_data import seed_database
from gridshare.backend.app.services.community_state_service import CommunityStateService
from gridshare.backend.app.services.rule_optimizer import RuleBasedOptimizer
from gridshare.backend.app.services.marketplace_service import MarketplaceService

class GridShareAPITestCase(unittest.TestCase):
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
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            seed_database(clear_existing=True)

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    # --- P2P MARKETPLACE LAYER TESTS ---
    def test_market_offers_and_requests_endpoints(self):
        """Test creating and listing marketplace offers and requests."""
        # Create Sell Offer
        offer_payload = {"household_id": "house_a", "energy_kwh": 3.5, "min_price_per_kwh": 4.10}
        res_o = self.client.post("/api/market/offers", json=offer_payload)
        self.assertEqual(res_o.status_code, 201)
        data_o = res_o.get_json()
        self.assertEqual(data_o["status"], "SUCCESS")
        self.assertEqual(data_o["offer"]["energy_kwh"], 3.5)
        self.assertEqual(data_o["offer"]["min_price_per_kwh"], 4.10)

        # List Offers
        res_lo = self.client.get("/api/market/offers")
        self.assertEqual(res_lo.status_code, 200)
        data_lo = res_lo.get_json()
        self.assertGreaterEqual(data_lo["count"], 1)

        # Create Buy Request
        req_payload = {"household_id": "house_b", "energy_kwh": 2.0, "max_price_per_kwh": 4.80}
        res_r = self.client.post("/api/market/requests", json=req_payload)
        self.assertEqual(res_r.status_code, 201)
        data_r = res_r.get_json()
        self.assertEqual(data_r["status"], "SUCCESS")
        self.assertEqual(data_r["request"]["energy_kwh"], 2.0)

        # List Requests
        res_lr = self.client.get("/api/market/requests")
        self.assertEqual(res_lr.status_code, 200)
        data_lr = res_lr.get_json()
        self.assertGreaterEqual(data_lr["count"], 1)

    def test_market_matching_compatible_prices(self):
        """Test matching when seller ask (4.00) <= buyer bid (5.00)."""
        with self.app.app_context():
            # Clear existing orders
            db.session.query(MarketOffer).delete()
            db.session.query(MarketRequest).delete()
            db.session.commit()

            # Seller A has 4.0 kWh @ min ₹4.00/kWh
            MarketplaceService.create_offer(household_id="house_a", energy_kwh=4.0, min_price_per_kwh=4.00)
            # Buyer B wants 2.5 kWh @ max ₹5.00/kWh
            MarketplaceService.create_request(household_id="house_b", energy_kwh=2.5, max_price_per_kwh=5.00)

            result = MarketplaceService.match_orders(auto_sync_if_empty=False)
            self.assertEqual(result["status"], "SUCCESS")
            self.assertEqual(result["transactions_count"], 1)
            self.assertEqual(result["source"], "SIMULATED")

            tx = result["transactions"][0]
            self.assertEqual(tx["seller_household_id"], "house_a")
            self.assertEqual(tx["buyer_household_id"], "house_b")
            self.assertEqual(tx["energy_kwh"], 2.50) # min(4.0, 2.5)
            self.assertEqual(tx["price_per_kwh"], 4.50) # (4.00 + 5.00) / 2.0
            self.assertEqual(tx["total_value"], 11.25) # 2.5 * 4.50

            # Verify seller offer remaining is 1.5 kWh
            remaining_offer = MarketOffer.query.filter_by(household_id="house_a").first()
            self.assertEqual(remaining_offer.remaining_kwh, 1.5)
            self.assertEqual(remaining_offer.status, "PARTIALLY_FILLED")

            # Verify buyer request is FILLED
            remaining_req = MarketRequest.query.filter_by(household_id="house_b").first()
            self.assertEqual(remaining_req.remaining_kwh, 0.0)
            self.assertEqual(remaining_req.status, "FILLED")

    def test_market_matching_incompatible_prices(self):
        """Test that matching does not occur when seller ask > buyer bid."""
        with self.app.app_context():
            db.session.query(MarketOffer).delete()
            db.session.query(MarketRequest).delete()
            db.session.commit()

            # Seller asks ₹6.50 (above grid)
            MarketplaceService.create_offer(household_id="house_a", energy_kwh=3.0, min_price_per_kwh=6.50)
            # Buyer only willing to pay ₹4.00
            MarketplaceService.create_request(household_id="house_b", energy_kwh=3.0, max_price_per_kwh=4.00)

            result = MarketplaceService.match_orders(auto_sync_if_empty=False)
            self.assertEqual(result["transactions_count"], 0)

    def test_market_transactions_endpoint(self):
        res = self.client.get("/api/market/transactions")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertEqual(data["source"], "SIMULATED")
        self.assertIn("transactions", data)

    # --- OPTIMIZE LAYER UNIT TESTS ---
    def test_optimizer_demo_scenario(self):
        res = RuleBasedOptimizer.allocate_energy(
            surplus_kw=4.70,
            deficit_kw=2.80,
            battery_soc=40.0,
            battery_capacity_kwh=50.0,
            max_charge_rate_kw=1.20,
        )
        summary = res["summary_allocation"]
        self.assertEqual(summary["local_trade_kw"], 2.80)
        self.assertEqual(summary["battery_allocation_kw"], 1.20)
        self.assertEqual(summary["grid_export_kw"], 0.70)
        self.assertAlmostEqual(summary["local_trade_kw"] + summary["battery_allocation_kw"] + summary["grid_export_kw"], 4.70, places=2)

    def test_optimizer_no_surplus(self):
        res = RuleBasedOptimizer.allocate_energy(
            surplus_kw=0.0,
            deficit_kw=3.0,
            battery_soc=40.0,
            battery_capacity_kwh=50.0,
            battery_min_reserve=20.0,
        )
        summary = res["summary_allocation"]
        self.assertEqual(summary["local_trade_kw"], 0.0)
        self.assertEqual(summary["battery_discharge_kw"], 3.0)

    def test_optimizer_no_deficit(self):
        res = RuleBasedOptimizer.allocate_energy(
            surplus_kw=5.0,
            deficit_kw=0.0,
            battery_soc=50.0,
            battery_capacity_kwh=50.0,
        )
        summary = res["summary_allocation"]
        self.assertEqual(summary["local_trade_kw"], 0.0)
        self.assertEqual(summary["battery_allocation_kw"], 5.0)

    def test_optimizer_full_battery(self):
        res = RuleBasedOptimizer.allocate_energy(
            surplus_kw=4.0,
            deficit_kw=1.0,
            battery_soc=100.0,
            battery_capacity_kwh=50.0,
        )
        summary = res["summary_allocation"]
        self.assertEqual(summary["local_trade_kw"], 1.0)
        self.assertEqual(summary["battery_allocation_kw"], 0.0)
        self.assertEqual(summary["grid_export_kw"], 3.0)

    def test_optimizer_low_battery(self):
        res = RuleBasedOptimizer.allocate_energy(
            surplus_kw=0.0,
            deficit_kw=4.0,
            battery_soc=15.0,
            battery_capacity_kwh=50.0,
            battery_min_reserve=20.0,
        )
        summary = res["summary_allocation"]
        self.assertEqual(summary["battery_discharge_kw"], 0.0)
        self.assertEqual(summary["grid_import_kw"], 4.0)

    def test_optimizer_surplus_greater_than_local_demand(self):
        res = RuleBasedOptimizer.allocate_energy(
            surplus_kw=10.0,
            deficit_kw=2.0,
            battery_soc=90.0,
            battery_capacity_kwh=50.0,
        )
        summary = res["summary_allocation"]
        self.assertEqual(summary["local_trade_kw"], 2.0)
        self.assertEqual(summary["battery_allocation_kw"], 5.0)
        self.assertEqual(summary["grid_export_kw"], 3.0)

    # --- OBSERVE LAYER TESTS ---
    def test_observe_surplus_household(self):
        result = CommunityStateService.classify_household_energy(generation_kw=6.8, consumption_kw=2.1)
        self.assertEqual(result["status"], "SURPLUS")
        self.assertAlmostEqual(result["net_energy_kw"], 4.7, places=2)

    def test_observe_deficit_household(self):
        result = CommunityStateService.classify_household_energy(generation_kw=1.2, consumption_kw=4.0)
        self.assertEqual(result["status"], "DEFICIT")
        self.assertAlmostEqual(result["net_energy_kw"], -2.8, places=2)

    def test_observe_balanced_household(self):
        result = CommunityStateService.classify_household_energy(generation_kw=2.500, consumption_kw=2.502)
        self.assertEqual(result["status"], "BALANCED")
        self.assertAlmostEqual(result["net_energy_kw"], 0.0, places=2)

    def test_observe_community_aggregation(self):
        with self.app.app_context():
            state = CommunityStateService.observe_community_state()
            summary = state["summary"]
            self.assertIn("total_generation_kw", summary)
            self.assertIn("total_consumption_kw", summary)
            self.assertIn("total_surplus_kw", summary)
            self.assertIn("total_deficit_kw", summary)
            self.assertIn("renewable_contribution_pct", summary)
            self.assertIn("community_battery_soc", summary)
            self.assertIn("current_grid_price", summary)
            self.assertGreater(summary["total_generation_kw"], 0.0)
            self.assertGreater(summary["total_consumption_kw"], 0.0)
            self.assertAlmostEqual(summary["community_battery_soc"], 40.0, places=1)
            self.assertEqual(summary["current_grid_price"], 6.10)
            self.assertEqual(state["source"], "SIMULATED")

    def test_observe_api_endpoint(self):
        res = self.client.get("/api/observe/state")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertIn("summary", data["data"])

    # --- ML PREDICTION ENDPOINTS TESTS ---
    def test_predictions_run_pipeline(self):
        res = self.client.post("/api/predictions/run")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertGreater(data["predictions_count"], 0)
        self.assertIn("latest_predictions", data)

    def test_predictions_get_latest(self):
        self.client.post("/api/predictions/run")
        res = self.client.get("/api/predictions/latest")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertIn("data", data)

    # --- REST API ENDPOINTS TESTS ---
    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")

    def test_get_households(self):
        res = self.client.get("/api/households")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreaterEqual(data["count"], 5)

    def test_get_household_detail(self):
        res = self.client.get("/api/households/house_a")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["household"]["id"], "house_a")

    def test_get_energy_live(self):
        res = self.client.get("/api/energy/live")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("readings", data)

    def test_get_energy_summary(self):
        res = self.client.get("/api/energy/summary")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("total_community_generation_kw", data["summary"])

    def test_get_and_patch_battery(self):
        res = self.client.get("/api/battery")
        self.assertEqual(res.status_code, 200)
        patch_res = self.client.patch("/api/battery", json={"current_soc": 55.0})
        self.assertEqual(patch_res.status_code, 200)
        data = patch_res.get_json()
        self.assertEqual(data["battery"]["current_soc"], 55.0)

    def test_optimization_run_and_latest_endpoints(self):
        opt_res = self.client.post("/api/optimization/run")
        self.assertEqual(opt_res.status_code, 200)
        data = opt_res.get_json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertEqual(data["engine_type"], "DETERMINISTIC_RULE_BASED")
        self.assertIn("allocation_plan", data)

        dec_res = self.client.get("/api/optimization/latest")
        self.assertEqual(dec_res.status_code, 200)

        trades_res = self.client.get("/api/trades")
        self.assertEqual(trades_res.status_code, 200)

    def test_dashboard_summary(self):
        res = self.client.get("/api/dashboard/summary")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("energy_summary", data["data"])

    def test_telemetry_ingestion(self):
        payload = {
            "household_id": "house_a",
            "generation_kw": 7.2,
            "consumption_kw": 1.9,
            "battery_soc": 88.0,
            "grid_price": 6.10,
            "source": "SIMULATED"
        }
        res = self.client.post("/api/telemetry", json=payload)
        self.assertEqual(res.status_code, 201)

if __name__ == "__main__":
    unittest.main()
