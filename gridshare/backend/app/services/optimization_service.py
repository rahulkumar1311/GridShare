from datetime import datetime, timezone
from gridshare.backend.app.models import (
    db,
    OptimizationDecision,
    EnergyReading,
    Household,
    Battery,
    EnergyTransaction,
)
from gridshare.backend.app.services.community_state_service import CommunityStateService
from gridshare.backend.app.services.rule_optimizer import RuleBasedOptimizer

class OptimizationService:
    @staticmethod
    def get_latest_decisions(limit=20):
        decisions = OptimizationDecision.query.order_by(OptimizationDecision.timestamp.desc()).limit(limit).all()
        return [d.to_dict() for d in decisions]

    @classmethod
    def run_optimization_engine(cls):
        """
        Executes the deterministic Rule-Based Optimization & Routing Engine.
        Prioritizes:
        1. Serve local community deficit (LOCAL_TRADE)
        2. Maintain battery reserve & Store remaining surplus (STORE)
        3. Export remaining surplus to grid (GRID_EXPORT)
        """
        now = datetime.now(timezone.utc)
        observed = CommunityStateService.observe_community_state()
        summary = observed["summary"]
        battery = Battery.query.first()

        surplus_kw = summary["total_surplus_kw"]
        deficit_kw = summary["total_deficit_kw"]
        battery_soc = summary["community_battery_soc"]
        battery_cap = summary["community_battery_capacity_kwh"]
        battery_min_reserve = battery.min_reserve if battery else 20.0
        grid_price = summary["current_grid_price"]
        p2p_price = summary["p2p_market_price"]

        # Run deterministic rule engine
        allocation_result = RuleBasedOptimizer.allocate_energy(
            surplus_kw=surplus_kw,
            deficit_kw=deficit_kw,
            battery_soc=battery_soc,
            battery_capacity_kwh=battery_cap,
            battery_min_reserve=battery_min_reserve,
            grid_price=grid_price,
            p2p_price=p2p_price,
        )

        persisted_decisions = []
        persisted_trades = []

        # Find specific prosumer and consumer household IDs for routing attribution
        surplus_nodes = [h for h in observed["households"] if h["status"] == "SURPLUS"]
        deficit_nodes = [h for h in observed["households"] if h["status"] == "DEFICIT"]

        s_name = surplus_nodes[0]["household_id"] if surplus_nodes else "COMMUNITY_SURPLUS_POOL"
        d_name = deficit_nodes[0]["household_id"] if deficit_nodes else "COMMUNITY_LOAD_POOL"

        for item in allocation_result["allocation_plan"]:
            action = item["action"]
            kw = item["energy_kwh"]
            reason = item["reason"]

            if kw <= 0 and action == "STORE_SKIPPED":
                continue

            if action == "LOCAL_TRADE":
                src = s_name
                tgt = d_name
                # Create P2P transaction record
                tx = EnergyTransaction(
                    seller_household_id=src,
                    buyer_household_id=tgt,
                    energy_kwh=kw,
                    price_per_kwh=p2p_price,
                    total_value=round(kw * p2p_price, 2),
                    status="COMPLETED",
                    timestamp=now,
                )
                db.session.add(tx)
                persisted_trades.append(tx)
            elif action == "STORE":
                src = s_name
                tgt = "COMMUNITY_BATTERY"
                if battery:
                    battery.current_soc = allocation_result["summary_allocation"]["final_battery_soc"]
            elif action == "GRID_EXPORT":
                src = s_name
                tgt = "MAIN_UTILITY_GRID"
            elif action == "DISCHARGE":
                src = "COMMUNITY_BATTERY"
                tgt = d_name
                if battery:
                    battery.current_soc = allocation_result["summary_allocation"]["final_battery_soc"]
            elif action == "GRID_IMPORT":
                src = "MAIN_UTILITY_GRID"
                tgt = d_name
            else:
                src = "COMMUNITY_GRID"
                tgt = "COMMUNITY_GRID"

            dec = OptimizationDecision(
                timestamp=now,
                source_household=src,
                target=tgt,
                energy_kwh=kw,
                action=action,
                reason=reason,
            )
            db.session.add(dec)
            persisted_decisions.append(dec)

        db.session.commit()

        return {
            "status": "SUCCESS",
            "executed_at": now.isoformat(),
            "engine_type": RuleBasedOptimizer.ENGINE_TYPE,
            "engine_version": RuleBasedOptimizer.ENGINE_VERSION,
            "input_state": allocation_result["input_state"],
            "summary_allocation": allocation_result["summary_allocation"],
            "allocation_plan": allocation_result["allocation_plan"],
            "persisted_decisions_count": len(persisted_decisions),
            "persisted_trades_count": len(persisted_trades),
        }
