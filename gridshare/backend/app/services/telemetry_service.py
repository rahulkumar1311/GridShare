from datetime import datetime, timezone
from gridshare.backend.app.models import db, EnergyReading, Household
from gridshare.backend.app.utils.logger import logger

class TelemetryService:
    @staticmethod
    def ingest_reading(data):
        """Process incoming smart meter telemetry data."""
        household_id = data.get("household_id")
        
        # Ensure household exists or auto-register
        household = db.session.get(Household, household_id)
        if not household:
            household = Household(
                id=household_id,
                name=data.get("household_name", f"Household {household_id}"),
                location=data.get("location", "Community Microgrid"),
                household_type=data.get("household_type", "PROSUMER"),
            )
            db.session.add(household)
            db.session.commit()

        timestamp_raw = data.get("timestamp")
        if timestamp_raw:
            try:
                ts = datetime.fromisoformat(timestamp_raw.replace("Z", "+00:00"))
            except Exception:
                ts = datetime.now(timezone.utc)
        else:
            ts = datetime.now(timezone.utc)

        reading = EnergyReading(
            household_id=household_id,
            timestamp=ts,
            generation_kw=float(data.get("generation_kw", 0.0)),
            consumption_kw=float(data.get("consumption_kw", 0.0)),
            battery_soc=float(data["battery_soc"]) if data.get("battery_soc") is not None else None,
            grid_price=float(data.get("grid_price", 6.10)),
            source=data.get("source", "SIMULATED"),
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(reading)
        db.session.commit()
        
        logger.info(f"Ingested telemetry for {household_id}: Gen={reading.generation_kw}kW, Con={reading.consumption_kw}kW, Net={reading.net_balance_kw}kW")
        return reading.to_dict()
