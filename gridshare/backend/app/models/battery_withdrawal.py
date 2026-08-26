from datetime import datetime, timezone
from . import db

class BatteryWithdrawal(db.Model):
    __tablename__ = "battery_withdrawals"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    battery_id = db.Column(db.String(50), db.ForeignKey("batteries.id"), nullable=False, index=True)
    household_id = db.Column(db.String(50), db.ForeignKey("households.id"), nullable=False, index=True)
    requested_energy_kwh = db.Column(db.Float, nullable=False)
    allocated_energy_kwh = db.Column(db.Float, nullable=False)
    contribution_source = db.Column(db.String(50), default="PROPORTIONAL_OWNERSHIP", nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    battery = db.relationship("Battery", back_populates="withdrawals")
    household = db.relationship("Household")

    def to_dict(self):
        return {
            "id": self.id,
            "battery_id": self.battery_id,
            "household_id": self.household_id,
            "requested_energy_kwh": round(self.requested_energy_kwh, 4),
            "allocated_energy_kwh": round(self.allocated_energy_kwh, 4),
            "contribution_source": self.contribution_source,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
