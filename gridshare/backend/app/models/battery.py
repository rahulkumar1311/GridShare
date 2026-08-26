from datetime import datetime, timezone
from . import db

class Battery(db.Model):
    __tablename__ = "batteries"

    id = db.Column(db.String(50), primary_key=True, default="community_battery_1")
    community_id = db.Column(db.String(50), nullable=False, default="green_enclave_cluster")
    capacity_kwh = db.Column(db.Float, nullable=False, default=50.0) # Total storage capacity
    current_energy_kwh = db.Column(db.Float, nullable=False, default=20.0) # Stored energy in kWh
    current_soc = db.Column(db.Float, nullable=False, default=40.0)  # State of Charge %
    round_trip_efficiency = db.Column(db.Float, nullable=False, default=0.90) # 90% round trip efficiency
    min_reserve = db.Column(db.Float, nullable=False, default=20.0)  # Minimum safety reserve %
    minimum_reserve_kwh = db.Column(db.Float, nullable=False, default=10.0) # Reserve threshold in kWh
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    contributions = db.relationship("BatteryContribution", back_populates="battery", lazy="dynamic", cascade="all, delete-orphan")
    withdrawals = db.relationship("BatteryWithdrawal", back_populates="battery", lazy="dynamic", cascade="all, delete-orphan")
    ledger_entries = db.relationship("BatteryLedger", back_populates="battery", lazy="dynamic", cascade="all, delete-orphan")

    def sync_soc_from_energy(self):
        """Maintains exact consistency between current_energy_kwh and current_soc."""
        if self.capacity_kwh > 0:
            self.current_soc = round((self.current_energy_kwh / self.capacity_kwh) * 100.0, 2)
            self.minimum_reserve_kwh = round((self.min_reserve / 100.0) * self.capacity_kwh, 2)

    def sync_energy_from_soc(self):
        """Maintains exact consistency from current_soc to current_energy_kwh."""
        if self.capacity_kwh > 0:
            self.current_energy_kwh = round((self.current_soc / 100.0) * self.capacity_kwh, 3)
            self.minimum_reserve_kwh = round((self.min_reserve / 100.0) * self.capacity_kwh, 2)

    def to_dict(self):
        stored = self.current_energy_kwh if self.current_energy_kwh is not None else round((self.current_soc / 100.0) * self.capacity_kwh, 2)
        reserve = self.minimum_reserve_kwh if self.minimum_reserve_kwh is not None else round((self.min_reserve / 100.0) * self.capacity_kwh, 2)
        available_dispatch = max(0.0, stored - reserve)
        available_headroom = max(0.0, self.capacity_kwh - stored)

        return {
            "id": self.id,
            "community_id": self.community_id,
            "capacity_kwh": round(self.capacity_kwh, 2),
            "current_energy_kwh": round(stored, 3),
            "current_soc": round(self.current_soc, 2),
            "round_trip_efficiency": round(self.round_trip_efficiency, 2),
            "efficiency_percent": round(self.round_trip_efficiency * 100.0, 1),
            "min_reserve_percent": round(self.min_reserve, 2),
            "minimum_reserve_kwh": round(reserve, 2),
            "stored_energy_kwh": round(stored, 2),
            "available_dispatch_kwh": round(available_dispatch, 3),
            "available_headroom_kwh": round(available_headroom, 3),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
