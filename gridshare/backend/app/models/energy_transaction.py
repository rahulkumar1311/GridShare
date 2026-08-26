from datetime import datetime, timezone
from . import db

class EnergyTransaction(db.Model):
    __tablename__ = "energy_transactions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    seller_household_id = db.Column(db.String(50), db.ForeignKey("households.id"), nullable=False, index=True)
    buyer_household_id = db.Column(db.String(50), db.ForeignKey("households.id"), nullable=False, index=True)
    energy_kwh = db.Column(db.Float, nullable=False)
    price_per_kwh = db.Column(db.Float, nullable=False) # e.g. ₹4.50 (discounted compared to grid ₹6.10)
    total_value = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), nullable=False, default="COMPLETED") # COMPLETED, PENDING, SETTLED
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "seller_household_id": self.seller_household_id,
            "buyer_household_id": self.buyer_household_id,
            "energy_kwh": round(self.energy_kwh, 3),
            "price_per_kwh": round(self.price_per_kwh, 2),
            "total_value": round(self.total_value, 2),
            "status": self.status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
