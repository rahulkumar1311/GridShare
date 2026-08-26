"""
OBSERVE LAYER: CommunityStateService
Continuously aggregates, analyzes, and classifies the live state of all
households and microgrid assets into a structured context object for
Prediction, Optimization, Dashboard, and Marketplace layers.
"""

from datetime import datetime, timezone
from gridshare.backend.app.models import db, Household, EnergyReading, Battery
from gridshare.backend.app.config import Config

class CommunityStateService:
    TOLERANCE_KW = 0.01  # Tolerance for BALANCED classification

    @classmethod
    def classify_household_energy(cls, generation_kw: float, consumption_kw: float) -> dict:
        """
        Calculate net energy and classify state as SURPLUS, DEFICIT, or BALANCED.
        """
        gen = float(generation_kw or 0.0)
        con = float(consumption_kw or 0.0)
        net = round(gen - con, 4)

        if net > cls.TOLERANCE_KW:
            status = "SURPLUS"
        elif net < -cls.TOLERANCE_KW:
            status = "DEFICIT"
        else:
            status = "BALANCED"

        return {
            "generation_kw": round(gen, 3),
            "consumption_kw": round(con, 3),
            "net_energy_kw": round(net, 3),
            "status": status,
        }

    @classmethod
    def observe_community_state(cls, timestamp=None) -> dict:
        """
        Compute the comprehensive live community state object.
        Consumable by prediction, optimization, marketplace, and dashboard.
        """
        now = timestamp or datetime.now(timezone.utc)
        households = Household.query.all()
        battery = Battery.query.first()

        households_state = []
        total_generation = 0.0
        total_consumption = 0.0
        total_surplus = 0.0
        total_deficit = 0.0

        surplus_nodes = []
        deficit_nodes = []
        balanced_nodes = []

        grid_price = Config.BASE_GRID_PRICE

        for h in households:
            latest = (
                EnergyReading.query.filter_by(household_id=h.id)
                .order_by(EnergyReading.timestamp.desc())
                .first()
            )
            
            gen = latest.generation_kw if latest else 0.0
            con = latest.consumption_kw if latest else 0.0
            soc = latest.battery_soc if latest else None
            price = latest.grid_price if latest else grid_price

            node_eval = cls.classify_household_energy(gen, con)
            net = node_eval["net_energy_kw"]
            status = node_eval["status"]

            total_generation += gen
            total_consumption += con

            if status == "SURPLUS":
                surplus_amount = round(net, 3)
                total_surplus += surplus_amount
                surplus_nodes.append(h.id)
            elif status == "DEFICIT":
                deficit_amount = round(abs(net), 3)
                total_deficit += deficit_amount
                deficit_nodes.append(h.id)
            else:
                balanced_nodes.append(h.id)

            households_state.append({
                "household_id": h.id,
                "name": h.name,
                "location": h.location,
                "household_type": h.household_type,
                "generation_kw": node_eval["generation_kw"],
                "consumption_kw": node_eval["consumption_kw"],
                "net_energy_kw": net,
                "status": status,
                "battery_soc": round(soc, 1) if soc is not None else None,
                "grid_price": price,
                "timestamp": latest.timestamp.isoformat() if (latest and latest.timestamp) else now.isoformat(),
            })

        # Calculate renewable contribution percentage
        if total_consumption > 0:
            renewable_contribution_pct = min(100.0, round((total_generation / total_consumption) * 100.0, 2))
        else:
            renewable_contribution_pct = 100.0 if total_generation > 0 else 0.0

        battery_soc = round(battery.current_soc, 2) if battery else 40.0
        battery_capacity = round(battery.capacity_kwh, 2) if battery else 50.0

        return {
            "timestamp": now.isoformat() if isinstance(now, datetime) else str(now),
            "observed_layer": "OBSERVE",
            "summary": {
                "total_generation_kw": round(total_generation, 3),
                "total_consumption_kw": round(total_consumption, 3),
                "total_surplus_kw": round(total_surplus, 3),
                "total_deficit_kw": round(total_deficit, 3),
                "net_community_balance_kw": round(total_generation - total_consumption, 3),
                "renewable_contribution_pct": renewable_contribution_pct,
                "community_battery_soc": battery_soc,
                "community_battery_capacity_kwh": battery_capacity,
                "current_grid_price": grid_price,
                "p2p_market_price": round(grid_price * Config.P2P_DISCOUNT_FACTOR, 2),
            },
            "nodes_breakdown": {
                "total_count": len(households),
                "surplus_count": len(surplus_nodes),
                "deficit_count": len(deficit_nodes),
                "balanced_count": len(balanced_nodes),
                "surplus_household_ids": surplus_nodes,
                "deficit_household_ids": deficit_nodes,
                "balanced_household_ids": balanced_nodes,
            },
            "households": households_state,
            "source": "SIMULATED",
        }
