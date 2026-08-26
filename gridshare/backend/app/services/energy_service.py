from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from gridshare.backend.app.models import db, EnergyReading, Household

class EnergyService:
    @staticmethod
    def get_live_readings():
        """Retrieve the most recent energy reading for every registered household."""
        households = Household.query.all()
        live_data = []

        for h in households:
            latest = (
                EnergyReading.query.filter_by(household_id=h.id)
                .order_by(EnergyReading.timestamp.desc())
                .first()
            )
            if latest:
                item = latest.to_dict()
                item["household_name"] = h.name
                item["household_type"] = h.household_type
                live_data.append(item)
            else:
                live_data.append({
                    "household_id": h.id,
                    "household_name": h.name,
                    "household_type": h.household_type,
                    "timestamp": None,
                    "generation_kw": 0.0,
                    "consumption_kw": 0.0,
                    "net_balance_kw": 0.0,
                    "battery_soc": None,
                    "grid_price": 6.10,
                    "source": "NONE",
                })
        return live_data

    @staticmethod
    def get_history(household_id=None, limit=100, hours=24):
        """Retrieve time-series historical readings."""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = EnergyReading.query.filter(EnergyReading.timestamp >= since)

        if household_id:
            query = query.filter_by(household_id=household_id)

        readings = query.order_by(EnergyReading.timestamp.asc()).limit(limit).all()
        return [r.to_dict() for r in readings]

    @staticmethod
    def get_energy_summary():
        """Compute aggregated community metrics."""
        live_list = EnergyService.get_live_readings()
        total_gen = sum(r.get("generation_kw", 0.0) for r in live_list)
        total_con = sum(r.get("consumption_kw", 0.0) for r in live_list)
        net_balance = round(total_gen - total_con, 3)

        surplus_nodes = [r for r in live_list if r.get("net_balance_kw", 0.0) > 0]
        deficit_nodes = [r for r in live_list if r.get("net_balance_kw", 0.0) < 0]

        return {
            "total_community_generation_kw": round(total_gen, 3),
            "total_community_consumption_kw": round(total_con, 3),
            "community_net_balance_kw": net_balance,
            "status": "SURPLUS" if net_balance > 0 else ("DEFICIT" if net_balance < 0 else "BALANCED"),
            "active_nodes_count": len(live_list),
            "surplus_nodes_count": len(surplus_nodes),
            "deficit_nodes_count": len(deficit_nodes),
            "base_grid_price": 6.10,
            "p2p_average_price": 4.50,
            "unit": "kW / kWh",
            "source": "SIMULATED",
        }
