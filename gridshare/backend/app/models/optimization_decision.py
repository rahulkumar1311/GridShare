from datetime import datetime, timezone
from . import db

class OptimizationDecision(db.Model):
    __tablename__ = "optimization_decisions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    source_household = db.Column(db.String(50), nullable=False) # e.g. 'house_a' or 'COMMUNITY_BATTERY'
    target = db.Column(db.String(50), nullable=False)           # e.g. 'house_b', 'COMMUNITY_BATTERY', 'MAIN_GRID'
    energy_kwh = db.Column(db.Float, nullable=False)
    action = db.Column(db.String(50), nullable=False)           # 'PEER_TO_PEER_ROUTE', 'BATTERY_CHARGE', 'BATTERY_DISCHARGE', 'GRID_EXPORT', 'GRID_IMPORT'
    reason = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "source_household": self.source_household,
            "target": self.target,
            "energy_kwh": round(self.energy_kwh, 3),
            "action": self.action,
            "reason": self.reason,
        }
