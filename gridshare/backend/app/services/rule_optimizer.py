"""
OPTIMIZE LAYER: RuleBasedOptimizer
Deterministic, explainable rule-based energy routing engine.
Allocates community surplus in strict priority order:
1. Serve local community deficit (LOCAL_TRADE)
2. Maintain battery reserve & Store surplus into community battery (STORE)
3. Export residual surplus to utility grid (GRID_EXPORT)
4. Deficit handling: Dispatch community storage (DISCHARGE) or import from grid (GRID_IMPORT)
"""

class RuleBasedOptimizer:
    ENGINE_TYPE = "DETERMINISTIC_RULE_BASED"
    ENGINE_VERSION = "rule_engine_v1.0"

    @classmethod
    def allocate_energy(
        cls,
        surplus_kw: float,
        deficit_kw: float,
        battery_soc: float = 40.0,
        battery_capacity_kwh: float = 50.0,
        battery_min_reserve: float = 20.0,
        grid_price: float = 6.10,
        p2p_price: float = 4.50,
        max_charge_rate_kw: float = 15.0,
    ) -> dict:
        """
        Compute an ordered, explainable energy allocation plan.
        """
        surplus = max(0.0, round(float(surplus_kw or 0.0), 3))
        deficit = max(0.0, round(float(deficit_kw or 0.0), 3))
        soc = min(100.0, max(0.0, float(battery_soc or 40.0)))
        capacity = max(1.0, float(battery_capacity_kwh or 50.0))
        min_reserve = min(100.0, max(0.0, float(battery_min_reserve or 20.0)))

        plan = []
        rem_surplus = surplus
        rem_deficit = deficit
        curr_soc = soc

        local_trade_kw = 0.0
        battery_allocation_kw = 0.0
        grid_export_kw = 0.0
        battery_discharge_kw = 0.0
        grid_import_kw = 0.0

        # -------------------------------------------------------------
        # PRIORITY 1: Serve local community deficit (LOCAL_TRADE)
        # -------------------------------------------------------------
        if rem_surplus > 0.001 and rem_deficit > 0.001:
            local_trade_kw = round(min(rem_surplus, rem_deficit), 3)
            rem_surplus = round(rem_surplus - local_trade_kw, 3)
            rem_deficit = round(rem_deficit - local_trade_kw, 3)
            
            savings_per_kwh = round(grid_price - p2p_price, 2)
            total_savings = round(local_trade_kw * savings_per_kwh, 2)
            
            plan.append({
                "step": 1,
                "action": "LOCAL_TRADE",
                "energy_kwh": local_trade_kw,
                "reason": (
                    f"Priority 1: Allocated {local_trade_kw} kW surplus to satisfy local community deficit "
                    f"at P2P rate Rs {p2p_price:.2f}/kWh (Community saved Rs {total_savings:.2f} vs grid Rs {grid_price:.2f}/kWh)."
                )
            })

        # -------------------------------------------------------------
        # PRIORITY 2 & 3: Store remaining surplus into community battery (STORE)
        # -------------------------------------------------------------
        if rem_surplus > 0.001:
            # Available battery headroom in kWh
            headroom_kwh = max(0.0, round((100.0 - curr_soc) * (capacity / 100.0), 3))
            max_storable = min(rem_surplus, headroom_kwh, max_charge_rate_kw)
            
            if max_storable > 0.001:
                battery_allocation_kw = round(max_storable, 3)
                rem_surplus = round(rem_surplus - battery_allocation_kw, 3)
                delta_soc = round((battery_allocation_kw / capacity) * 100.0, 1)
                new_soc = min(100.0, round(curr_soc + delta_soc, 1))

                plan.append({
                    "step": 2,
                    "action": "STORE",
                    "energy_kwh": battery_allocation_kw,
                    "reason": (
                        f"Priority 2/3: Diverted {battery_allocation_kw} kW surplus into community battery "
                        f"(SOC increases from {curr_soc:.1f}% to {new_soc:.1f}%, Headroom was {headroom_kwh:.1f} kWh)."
                    )
                })
                curr_soc = new_soc
            else:
                # Battery full or at capacity
                plan.append({
                    "step": 2,
                    "action": "STORE_SKIPPED",
                    "energy_kwh": 0.0,
                    "reason": f"Priority 2/3: Battery at capacity (SOC {curr_soc:.1f}%). Storage bypassed."
                })

        # -------------------------------------------------------------
        # PRIORITY 4: Export remaining surplus to grid (GRID_EXPORT)
        # -------------------------------------------------------------
        if rem_surplus > 0.001:
            grid_export_kw = round(rem_surplus, 3)
            rem_surplus = 0.0
            earnings = round(grid_export_kw * grid_price, 2)

            plan.append({
                "step": 3,
                "action": "GRID_EXPORT",
                "energy_kwh": grid_export_kw,
                "reason": (
                    f"Priority 4: Exported {grid_export_kw} kW residual surplus to utility grid "
                    f"at benchmark feed-in rate Rs {grid_price:.2f}/kWh (Revenue: Rs {earnings:.2f})."
                )
            })

        # -------------------------------------------------------------
        # DEFICIT RESOLUTION (If initial demand exceeded local surplus)
        # -------------------------------------------------------------
        if rem_deficit > 0.001:
            # Check if community battery can discharge (above safety reserve)
            usable_energy_kwh = max(0.0, round((curr_soc - min_reserve) * (capacity / 100.0), 3))
            if usable_energy_kwh > 0.001:
                battery_discharge_kw = round(min(rem_deficit, usable_energy_kwh, max_charge_rate_kw), 3)
                rem_deficit = round(rem_deficit - battery_discharge_kw, 3)
                delta_soc = round((battery_discharge_kw / capacity) * 100.0, 1)
                new_soc = max(min_reserve, round(curr_soc - delta_soc, 1))

                plan.append({
                    "step": 4,
                    "action": "DISCHARGE",
                    "energy_kwh": battery_discharge_kw,
                    "reason": (
                        f"Deficit Resolution: Discharged {battery_discharge_kw} kW from community battery "
                        f"(SOC reduced from {curr_soc:.1f}% to {new_soc:.1f}%, keeping reserve >= {min_reserve:.1f}%)."
                    )
                })
                curr_soc = new_soc

            # If deficit still remains, import from grid
            if rem_deficit > 0.001:
                grid_import_kw = round(rem_deficit, 3)
                rem_deficit = 0.0
                cost = round(grid_import_kw * grid_price, 2)

                plan.append({
                    "step": 5,
                    "action": "GRID_IMPORT",
                    "energy_kwh": grid_import_kw,
                    "reason": (
                        f"Grid Fallback: Imported {grid_import_kw} kW from utility grid "
                        f"at Rs {grid_price:.2f}/kWh (Cost: Rs {cost:.2f}) to meet remaining community deficit."
                    )
                })

        # If zero surplus and zero deficit
        if surplus <= 0.001 and deficit <= 0.001:
            plan.append({
                "step": 1,
                "action": "BALANCED_IDLE",
                "energy_kwh": 0.0,
                "reason": "Community is perfectly balanced in net generation and load. No routing required."
            })

        return {
            "engine_type": cls.ENGINE_TYPE,
            "engine_version": cls.ENGINE_VERSION,
            "input_state": {
                "available_surplus_kw": surplus,
                "community_deficit_kw": deficit,
                "initial_battery_soc": soc,
                "battery_capacity_kwh": capacity,
                "battery_min_reserve": min_reserve,
                "grid_price": grid_price,
                "p2p_price": p2p_price,
            },
            "summary_allocation": {
                "local_trade_kw": local_trade_kw,
                "battery_allocation_kw": battery_allocation_kw,
                "grid_export_kw": grid_export_kw,
                "battery_discharge_kw": battery_discharge_kw,
                "grid_import_kw": grid_import_kw,
                "final_battery_soc": curr_soc,
            },
            "allocation_plan": plan,
        }
