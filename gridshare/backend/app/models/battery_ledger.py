from datetime import datetime, timezone
from . import db

class BatteryLedger(db.Model):
    __tablename__ = "battery_ledger"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    battery_id = db.Column(db.String(50), db.ForeignKey("batteries.id"), nullable=False, index=True)
    household_id = db.Column(db.String(50), db.ForeignKey("households.id"), nullable=True, index=True)
    action_type = db.Column(db.String(30), nullable=False) # CONTRIBUTION, WITHDRAWAL, EFFICIENCY_LOSS, RESERVE_HOLD, OPTIMIZER_DISPATCH
    energy_kwh = db.Column(db.Float, nullable=False)
    usable_kwh = db.Column(db.Float, nullable=False)
    balance_after_kwh = db.Column(db.Float, nullable=False)
    soc_after_percent = db.Column(db.Float, nullable=False)
    economic_value_inr = db.Column(db.Float, nullable=True) # Simulated value calculation
    policy_applied = db.Column(db.String(50), default="PROPORTIONAL_OWNERSHIP")
    reason = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    battery = db.relationship("Battery", back_populates="ledger_entries")
    household = db.relationship("Household")

    def to_dict(self):
        return {
            "id": self.id,
            "battery_id": self.battery_id,
            "household_id": self.household_id,
            "action_type": self.action_type,
            "energy_kwh": round(self.energy_kwh, 4),
            "usable_kwh": round(self.usable_kwh, 4),
            "balance_after_kwh": round(self.balance_after_kwh, 3),
            "soc_after_percent": round(self.soc_after_percent, 2),
            "economic_value_inr": round(self.economic_value_inr, 2) if self.economic_value_inr is not None else 0.0,
            "policy_applied": self.policy_applied,
            "reason": self.reason,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
