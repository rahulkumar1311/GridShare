from datetime import datetime, timezone
from . import db

class BatteryContribution(db.Model):
    __tablename__ = "battery_contributions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    battery_id = db.Column(db.String(50), db.ForeignKey("batteries.id"), nullable=False, index=True)
    household_id = db.Column(db.String(50), db.ForeignKey("households.id"), nullable=False, index=True)
    contributed_energy_kwh = db.Column(db.Float, nullable=False)  # Raw injected energy
    usable_energy_kwh = db.Column(db.Float, nullable=False)       # Usable after round-trip efficiency (e.g. * 0.90)
    remaining_credit_kwh = db.Column(db.Float, nullable=False)    # Current unwithdrawn energy credit
    contribution_timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = db.Column(db.String(20), default="ACTIVE", nullable=False) # ACTIVE, PARTIALLY_WITHDRAWN, DEPLETED

    # Relationships
    battery = db.relationship("Battery", back_populates="contributions")
    household = db.relationship("Household")

    def to_dict(self):
        return {
            "id": self.id,
            "battery_id": self.battery_id,
            "household_id": self.household_id,
            "contributed_energy_kwh": round(self.contributed_energy_kwh, 4),
            "usable_energy_kwh": round(self.usable_energy_kwh, 4),
            "remaining_credit_kwh": round(self.remaining_credit_kwh, 4),
            "loss_kwh": round(self.contributed_energy_kwh - self.usable_energy_kwh, 4),
            "contribution_timestamp": self.contribution_timestamp.isoformat() if self.contribution_timestamp else None,
            "status": self.status,
        }
