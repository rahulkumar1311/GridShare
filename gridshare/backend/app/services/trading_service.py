from gridshare.backend.app.models import db, EnergyTransaction
from .optimization_service import OptimizationService

class TradingService:
    @staticmethod
    def get_trades(limit=50):
        trades = EnergyTransaction.query.order_by(EnergyTransaction.timestamp.desc()).limit(limit).all()
        return [t.to_dict() for t in trades]

    @staticmethod
    def match_orders():
        """Trigger instant order matching via the optimization rule engine."""
        return OptimizationService.run_optimization_engine()
