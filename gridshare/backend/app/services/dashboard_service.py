from .energy_service import EnergyService
from .battery_service import BatteryService
from .optimization_service import OptimizationService
from .trading_service import TradingService
from .prediction_service import PredictionService

class DashboardService:
    @staticmethod
    def get_dashboard_summary():
        """Consolidated summary for the React Dashboard."""
        energy_summary = EnergyService.get_energy_summary()
        live_nodes = EnergyService.get_live_readings()
        battery = BatteryService.get_community_battery()
        recent_trades = TradingService.get_trades(limit=5)
        recent_decisions = OptimizationService.get_latest_decisions(limit=5)
        recent_predictions = PredictionService.get_predictions(limit=10)

        # Total energy traded in P2P
        total_p2p_kwh = sum(t.get("energy_kwh", 0) for t in recent_trades)
        total_p2p_savings = round(total_p2p_kwh * (6.10 - 4.50), 2)

        return {
            "energy_summary": energy_summary,
            "battery": battery,
            "live_nodes": live_nodes,
            "recent_trades": recent_trades,
            "recent_decisions": recent_decisions,
            "recent_predictions": recent_predictions,
            "metrics": {
                "community_self_sufficiency_pct": round(
                    min(100.0, (energy_summary["total_community_generation_kw"] / max(0.1, energy_summary["total_community_consumption_kw"])) * 100.0), 1
                ),
                "total_p2p_traded_kwh": round(total_p2p_kwh, 2),
                "total_community_savings_inr": total_p2p_savings,
                "benchmark_grid_rate": 6.10,
                "p2p_clearing_rate": 4.50,
            },
            "source": "SIMULATED",
        }
