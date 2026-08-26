from datetime import datetime, timezone
from gridshare.backend.app.models import db, Battery

class BatteryService:
    @staticmethod
    def get_community_battery():
        battery = Battery.query.first()
        if not battery:
            battery = Battery(
                id="COMMUNITY_BATTERY_01",
                community_id="COMMUNITY_GREEN_ENCLAVE",
                capacity_kwh=50.0,
                current_soc=40.0,
                min_reserve=20.0,
            )
            db.session.add(battery)
            db.session.commit()
        return battery.to_dict()

    @staticmethod
    def update_battery(current_soc=None, min_reserve=None):
        battery = Battery.query.first()
        if not battery:
            battery = Battery(id="COMMUNITY_BATTERY_01")
            db.session.add(battery)

        if current_soc is not None:
            battery.current_soc = float(current_soc)
        if min_reserve is not None:
            battery.min_reserve = float(min_reserve)

        battery.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return battery.to_dict()
