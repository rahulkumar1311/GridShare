from datetime import datetime, timezone
from . import db

class EnergyReading(db.Model):
    __tablename__ = "energy_readings"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    household_id = db.Column(db.String(50), db.ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    generation_kw = db.Column(db.Float, nullable=False, default=0.0)
    consumption_kw = db.Column(db.Float, nullable=False, default=0.0)
    battery_soc = db.Column(db.Float, nullable=True) # Percentage (0-100)
    grid_price = db.Column(db.Float, nullable=False, default=6.10) # ₹ per kWh
    source = db.Column(db.String(50), nullable=False, default="SIMULATED") # "SIMULATED", "HARDWARE_ESP32"
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    @property
    def net_balance_kw(self):
        return round((self.generation_kw or 0.0) - (self.consumption_kw or 0.0), 3)

    def to_dict(self):
        return {
            "id": self.id,
            "household_id": self.household_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "generation_kw": round(self.generation_kw, 3),
            "consumption_kw": round(self.consumption_kw, 3),
            "net_balance_kw": self.net_balance_kw,
            "battery_soc": round(self.battery_soc, 1) if self.battery_soc is not None else None,
            "grid_price": round(self.grid_price, 2),
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
