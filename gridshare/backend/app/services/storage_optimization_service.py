"""
Storage vs. Grid Export Decision Optimization Engine.
Compares immediate feed-in export revenue against round-trip efficiency-adjusted
storage value for meeting predicted evening peak community demand.
Notice: All tariffs and valuations are simulated for prototyping.
"""

from gridshare.backend.app.models import db, Battery
from gridshare.backend.app.services.battery_accounting_service import BatteryAccountingService

class StorageOptimizationService:
    BASE_GRID_EXPORT_PRICE = 3.50    # Standard feed-in tariff (₹/kWh)
    BASE_GRID_IMPORT_PRICE = 6.10    # Standard utility purchase tariff (₹/kWh)
    PEAK_AVOIDANCE_VALUE = 7.20      # Value of avoiding peak tariff purchase (₹/kWh)

    @classmethod
    def evaluate_storage_vs_export(
        cls,
        surplus_kwh,
        current_grid_price=None,
        predicted_evening_demand_kw=None,
        battery_id=None,
    ):
        """
        Decision Rule:
        1. Calculate immediate Grid Export Value: E * P_export
        2. Calculate Battery Stored Usable Energy: E * efficiency (e.g. 90%)
        3. Calculate Expected Future Stored Value: (E * efficiency) * P_future_avoidance
        4. Check physical storage headroom: capacity - current_energy
        """
        grid_export_tariff = current_grid_price or cls.BASE_GRID_EXPORT_PRICE
        future_avoidance_tariff = cls.PEAK_AVOIDANCE_VALUE
        battery_state = BatteryAccountingService.get_battery_state(battery_id)

        capacity = battery_state["capacity_kwh"]
        current_energy = battery_state["current_energy_kwh"]
        efficiency = battery_state["round_trip_efficiency"]
        available_headroom = battery_state["available_headroom_kwh"]

        # 1. Economic Valuations
        immediate_export_value = round(surplus_kwh * grid_export_tariff, 2)
        usable_stored_kwh = round(surplus_kwh * efficiency, 4)
        expected_future_storage_value = round(usable_stored_kwh * future_avoidance_tariff, 2)
        net_storage_benefit = round(expected_future_storage_value - immediate_export_value, 2)

        # 2. Constraints & Demand Condition
        has_storage_headroom = available_headroom >= 0.5
        demand_forecast = predicted_evening_demand_kw if predicted_evening_demand_kw is not None else 4.2
        is_future_demand_high = demand_forecast >= 2.0

        # 3. Decision Logic
        if has_storage_headroom and is_future_demand_high and expected_future_storage_value > immediate_export_value:
            decision = "STORE"
            allocated_storage_kwh = min(surplus_kwh, available_headroom)
            residual_export_kwh = max(0.0, surplus_kwh - allocated_storage_kwh)
            reason = (
                f"STORE: Predicted evening demand ({demand_forecast:.1f} kW) and available battery headroom "
                f"({available_headroom:.1f} kWh) make storage preferable (Estimated Storage Value: ₹{expected_future_storage_value:.2f} "
                f"vs Immediate Export: ₹{immediate_export_value:.2f} after {int(efficiency*100)}% round-trip efficiency)."
            )
        else:
            decision = "GRID_EXPORT"
            allocated_storage_kwh = 0.0
            residual_export_kwh = surplus_kwh
            if not has_storage_headroom:
                reason = f"GRID_EXPORT: Community battery is at capacity ({current_energy:.1f}/{capacity:.1f} kWh). Routing all surplus to utility grid."
            else:
                reason = f"GRID_EXPORT: Current export tariff (₹{grid_export_tariff:.2f}/kWh) exceeds expected storage benefit under current conditions."

        return {
            "status": "SUCCESS",
            "decision": decision,
            "surplus_kwh": round(surplus_kwh, 4),
            "allocated_storage_kwh": round(allocated_storage_kwh, 4),
            "residual_export_kwh": round(residual_export_kwh, 4),
            "usable_stored_kwh": round(allocated_storage_kwh * efficiency, 4),
            "efficiency_rate": efficiency,
            "economic_analysis": {
                "immediate_grid_export_value_inr": immediate_export_value,
                "expected_future_storage_value_inr": expected_future_storage_value,
                "net_storage_benefit_inr": net_storage_benefit,
                "export_tariff_per_kwh": grid_export_tariff,
                "future_avoidance_tariff_per_kwh": future_avoidance_tariff,
            },
            "battery_context": {
                "capacity_kwh": capacity,
                "current_energy_kwh": current_energy,
                "available_headroom_kwh": available_headroom,
                "soc_percent": battery_state["current_soc"],
            },
            "predicted_demand_kw": demand_forecast,
            "reason": reason,
            "source": "SIMULATED",
        }
