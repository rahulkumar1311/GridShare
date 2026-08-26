from datetime import datetime, timezone
from . import db

class MarketOffer(db.Model):
    """Sell order placed by prosumers with surplus generation."""
    __tablename__ = "market_offers"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    household_id = db.Column(db.String(50), db.ForeignKey("households.id"), nullable=False, index=True)
    energy_kwh = db.Column(db.Float, nullable=False)
    min_price_per_kwh = db.Column(db.Float, nullable=False, default=4.00) # INR
    remaining_kwh = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), nullable=False, default="OPEN") # OPEN, FILLED, PARTIALLY_FILLED, CANCELLED
    source = db.Column(db.String(50), nullable=False, default="SIMULATED")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "household_id": self.household_id,
            "energy_kwh": round(self.energy_kwh, 3),
            "min_price_per_kwh": round(self.min_price_per_kwh, 2),
            "remaining_kwh": round(self.remaining_kwh, 3),
            "status": self.status,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class MarketRequest(db.Model):
    """Buy order placed by consumers with energy deficit."""
    __tablename__ = "market_requests"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    household_id = db.Column(db.String(50), db.ForeignKey("households.id"), nullable=False, index=True)
    energy_kwh = db.Column(db.Float, nullable=False)
    max_price_per_kwh = db.Column(db.Float, nullable=False, default=5.00) # INR
    remaining_kwh = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), nullable=False, default="OPEN") # OPEN, FILLED, PARTIALLY_FILLED, CANCELLED
    source = db.Column(db.String(50), nullable=False, default="SIMULATED")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "household_id": self.household_id,
            "energy_kwh": round(self.energy_kwh, 3),
            "max_price_per_kwh": round(self.max_price_per_kwh, 2),
            "remaining_kwh": round(self.remaining_kwh, 3),
            "status": self.status,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
