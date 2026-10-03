"""
Feeder-Level Forecast & Multi-Interval DER Optimization Service.

Integrates GridShare's trained Random Forest demand model and diurnal solar model
with neighbourhood feeder constraints, shared community ESS, and flexible load shifting.

Schneider Electric Yuva Yodha 2026 — Challenge 03: Grid Reliability & Renewable Intermittency.
"""

import math
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from gridshare.ml.predict import DemandPredictor
from gridshare.backend.app.services.feeder_simulation_engine import (
    FeederSimulationEngine,
    FeederConfig,
    BatteryState,
    HouseholdNodeConfig,
)
from gridshare.backend.app.models import EnergyReading

class FeederForecastOptimizerService:
    """
    Orchestrates multi-interval forward-looking optimization across the neighbourhood feeder.
    Detects renewable shortfalls, coordinates storage buffers, shifts deferrable loads,
    and protects essential electrical loads at all times.
    """

    DEFAULT_ESS_CAPACITY_KWH = 50.0
    DEFAULT_ESS_RESERVE_PCT = 20.0
    DEFAULT_ESS_MAX_POWER_KW = 15.0

    @classmethod
    def get_feeder_forecasts(
        cls,
        horizon_hours: int = 6,
        households: Optional[List[HouseholdNodeConfig]] = None,
    ) -> Dict[str, Any]:
        """
        Runs the trained Random Forest inference model for each household in the feeder.
        Outputs short-term demand predictions, empirical ensemble uncertainty (tree std dev),
        and analytical diurnal solar generation.
        """
        predictor = DemandPredictor()
        hh_configs = households or FeederSimulationEngine._get_default_households()
        
        household_forecasts = {}
        for h in hh_configs:
            # Attempt to pull recent readings from DB context if available
            recent_dicts = None
            try:
                readings = (
                    EnergyReading.query.filter_by(household_id=h.id)
                    .order_by(EnergyReading.timestamp.desc())
                    .limit(5)
                    .all()
                )
                if readings:
                    recent_dicts = [r.to_dict() for r in reversed(readings)]
            except Exception:
                recent_dicts = None

            fc = predictor.predict_next_hours(
                household_id=h.id,
                recent_readings=recent_dicts,
                horizon_hours=horizon_hours,
            )
            household_forecasts[h.id] = {
                "config": h,
                "steps": fc,
            }

        return household_forecasts

    @classmethod
    def optimize_feeder_horizon(
        cls,
        horizon_hours: int = 6,
        initial_battery_soc: float = 40.0,
        battery_capacity_kwh: float = DEFAULT_ESS_CAPACITY_KWH,
        battery_reserve_pct: float = DEFAULT_ESS_RESERVE_PCT,
        max_battery_power_kw: float = DEFAULT_ESS_MAX_POWER_KW,
        grid_import_tariff_per_kwh: float = 6.10,
        grid_peak_tariff_per_kwh: float = 8.50,
        grid_export_feedin_per_kwh: float = 3.50,
        p2p_clearing_tariff_per_kwh: float = 4.50,
        transformer_capacity_kva: float = 50.0,
        allow_flexible_load_shift: bool = True,
    ) -> Dict[str, Any]:
        """
        Forward-looking multi-interval feeder optimization:
        1. Predicts interval-by-interval demand and solar generation using Random Forest.
        2. Aggregates feeder-level net balances.
        3. Identifies deficit intervals where forecast demand exceeds renewable generation + battery.
        4. Calculates feasible dispatch, load shifts, and grid exchanges.
        5. Protects essential loads with zero curtailment.
        """
        hh_configs = FeederSimulationEngine._get_default_households()
        # Clamp inputs to safe physical ranges
        horizon_hours = max(1, min(24, int(horizon_hours)))
        initial_battery_soc = max(0.0, min(100.0, float(initial_battery_soc)))
        battery_capacity_kwh = max(1.0, float(battery_capacity_kwh))
        battery_reserve_pct = max(0.0, min(100.0, float(battery_reserve_pct)))
        max_battery_power_kw = max(0.1, float(max_battery_power_kw))
        transformer_capacity_kva = max(1.0, float(transformer_capacity_kva))

        hh_forecasts = cls.get_feeder_forecasts(horizon_hours=horizon_hours, households=hh_configs)

        # Initialize simulated forward battery state
        init_energy_kwh = battery_capacity_kwh * (initial_battery_soc / 100.0)
        sim_battery = BatteryState(
            id="comm_ess_opt",
            capacity_kwh=battery_capacity_kwh,
            current_energy_kwh=init_energy_kwh,
            min_reserve_pct=battery_reserve_pct,
            max_charge_power_kw=max_battery_power_kw,
            max_discharge_power_kw=max_battery_power_kw,
            charge_efficiency=0.95,
            discharge_efficiency=0.95,
        )

        max_transformer_kw = transformer_capacity_kva * 0.95
        dt = 1.0  # 1 hour intervals

        intervals_summary = []
        recommendations = []
        detected_shortfalls = []
        candidate_shift_hours = []

        total_forecast_demand_kwh = 0.0
        total_forecast_solar_kwh = 0.0
        total_battery_charged_kwh = 0.0
        total_battery_discharged_kwh = 0.0
        total_grid_imported_kwh = 0.0
        total_grid_exported_kwh = 0.0
        total_p2p_reallocated_kwh = 0.0
        total_shifted_load_kwh = 0.0

        # Phase 1: Aggregate Feeder Forecasts & Detect Deficits per interval
        for t in range(horizon_hours):
            t_demand_kw = 0.0
            t_essential_kw = 0.0
            t_flexible_kw = 0.0
            t_solar_kw = 0.0
            t_uncertainty_sq = 0.0
            t_time_label = ""
            time_obj = None

            prosumer_surplus_kw = 0.0
            consumer_deficit_kw = 0.0

            for h in hh_configs:
                h_step = hh_forecasts[h.id]["steps"][t]
                pred_d = h_step["predicted_demand_kw"]
                pred_s = h_step["predicted_generation_kw"]
                u_val = h_step.get("uncertainty_value") or 0.12

                t_time_label = h_step.get("time_label", f"+{t+1}h")
                t_demand_kw += pred_d
                t_solar_kw += pred_s
                t_uncertainty_sq += (u_val ** 2)

                # Divide into essential vs flexible
                # Prosumer villas ~ 55% essential, EV homes ~ 45% essential
                ess_ratio = h.base_essential_kw / max(0.1, (h.base_essential_kw + h.base_flexible_kw))
                ess_kw = round(pred_d * ess_ratio, 3)
                flex_kw = round(pred_d * (1.0 - ess_ratio), 3)

                t_essential_kw += ess_kw
                t_flexible_kw += flex_kw

                net_h = pred_s - pred_d
                if net_h > 0:
                    prosumer_surplus_kw += net_h
                else:
                    consumer_deficit_kw += abs(net_h)

            t_demand_kw = round(t_demand_kw, 3)
            t_solar_kw = round(t_solar_kw, 3)
            t_essential_kw = round(t_essential_kw, 3)
            t_flexible_kw = round(t_flexible_kw, 3)
            aggregate_uncertainty_kw = round(math.sqrt(t_uncertainty_sq), 3)

            # Tariff schedule: peak pricing from 18:00 to 22:00
            current_hour_approx = (datetime.now(timezone.utc).hour + t + 1) % 24
            is_peak_tariff = (18 <= current_hour_approx <= 22)
            active_import_tariff = grid_peak_tariff_per_kwh if is_peak_tariff else grid_import_tariff_per_kwh

            raw_net_balance_kw = round(t_solar_kw - t_demand_kw, 3)

            # Check if this hour is a solar surplus interval (candidate to receive shifted flexible loads)
            if raw_net_balance_kw > 1.5:
                candidate_shift_hours.append({
                    "step_index": t,
                    "time_label": t_time_label,
                    "surplus_headroom_kw": raw_net_balance_kw,
                })

            intervals_summary.append({
                "step_index": t,
                "time_label": t_time_label,
                "hour_of_day": current_hour_approx,
                "is_peak_tariff": is_peak_tariff,
                "active_import_tariff": active_import_tariff,
                "forecast_demand_kw": t_demand_kw,
                "forecast_essential_demand_kw": t_essential_kw,
                "forecast_flexible_demand_kw": t_flexible_kw,
                "forecast_solar_kw": t_solar_kw,
                "raw_net_balance_kw": raw_net_balance_kw,
                "aggregate_uncertainty_kw": aggregate_uncertainty_kw,
                "local_prosumer_surplus_kw": round(prosumer_surplus_kw, 3),
                "local_consumer_deficit_kw": round(consumer_deficit_kw, 3),
                "battery_start_soc": sim_battery.soc_pct,
                "battery_start_stored_kwh": round(sim_battery.current_energy_kwh, 3),
            })

        # Phase 2: Sequential DER & Battery Dispatch
        for t, iv in enumerate(intervals_summary):
            raw_net = iv["raw_net_balance_kw"]
            tariff_in = iv["active_import_tariff"]
            t_label = iv["time_label"]
            start_soc = sim_battery.soc_pct
            start_kwh = sim_battery.current_energy_kwh

            # Step A: Local P2P Coordination
            p2p_cleared_kw = round(min(iv["local_prosumer_surplus_kw"], iv["local_consumer_deficit_kw"]), 3)
            if p2p_cleared_kw > 0.05:
                total_p2p_reallocated_kwh += p2p_cleared_kw * dt
                recommendations.append({
                    "interval": t_label,
                    "step_index": t,
                    "action_type": "P2P_LOCAL_MATCH",
                    "target_power_kw": p2p_cleared_kw,
                    "energy_kwh": round(p2p_cleared_kw * dt, 3),
                    "reason": f"Coordinated {p2p_cleared_kw} kW local peer matching between prosumers and consumers.",
                    "financial_impact_inr": round(p2p_cleared_kw * dt * (tariff_in - p2p_clearing_tariff_per_kwh), 2),
                    "financial_benefit_description": f"Saves ₹{(tariff_in - p2p_clearing_tariff_per_kwh):.2f}/kWh vs utility grid import.",
                    "constraints_checked": "Physical prosumer surplus >= P2P matched volume within feeder.",
                    "essential_load_protected": True,
                    "forecast_uncertainty_kw": iv["aggregate_uncertainty_kw"],
                })

            # Step B: Deficit Mitigation or Surplus Capture
            battery_charge_kw = 0.0
            battery_discharge_kw = 0.0
            grid_import_kw = 0.0
            grid_export_kw = 0.0
            shifted_flex_kw = 0.0
            unmet_shortfall_kw = 0.0

            if raw_net > 0.001:
                # SURPLUS INTERVAL: Charge Shared Battery
                headroom = sim_battery.headroom_kwh
                if headroom > 0.1 and sim_battery.soc_pct < 98.0:
                    ch_p, stored, loss = sim_battery.charge(raw_net, dt)
                    battery_charge_kw = ch_p
                    total_battery_charged_kwh += stored
                    residual_surplus = max(0.0, raw_net - ch_p)

                    recommendations.append({
                        "interval": t_label,
                        "step_index": t,
                        "action_type": "CHARGE_COMMUNITY_ESS",
                        "target_power_kw": ch_p,
                        "energy_kwh": round(stored, 3),
                        "reason": f"Capturing {ch_p} kW midday solar surplus into community ESS (SOC {start_soc:.1f}% -> {sim_battery.soc_pct:.1f}%).",
                        "financial_impact_inr": round(stored * (grid_peak_tariff_per_kwh - grid_export_feedin_per_kwh), 2),
                        "financial_benefit_description": f"Arbitrage: Stores surplus instead of feed-in (₹{grid_export_feedin_per_kwh}/kWh) to offset peak grid (₹{grid_peak_tariff_per_kwh}/kWh).",
                        "constraints_checked": f"Capacity headroom ({headroom:.1f} kWh), max charge rate ({sim_battery.max_charge_power_kw} kW), 95% charge efficiency.",
                        "essential_load_protected": True,
                        "forecast_uncertainty_kw": iv["aggregate_uncertainty_kw"],
                    })
                else:
                    residual_surplus = raw_net

                # Export remaining surplus to grid
                if residual_surplus > 0.001:
                    grid_export_kw = min(residual_surplus, max_transformer_kw)
                    total_grid_exported_kwh += grid_export_kw * dt
                    recommendations.append({
                        "interval": t_label,
                        "step_index": t,
                        "action_type": "EXPORT_GRID",
                        "target_power_kw": grid_export_kw,
                        "energy_kwh": round(grid_export_kw * dt, 3),
                        "reason": f"Feeding {grid_export_kw} kW residual clean solar into utility grid via feed-in tariff.",
                        "financial_impact_inr": round(grid_export_kw * dt * grid_export_feedin_per_kwh, 2),
                        "financial_benefit_description": f"Earns ₹{grid_export_feedin_per_kwh}/kWh feed-in revenue.",
                        "constraints_checked": f"Transformer capacity ({max_transformer_kw} kW).",
                        "essential_load_protected": True,
                        "forecast_uncertainty_kw": iv["aggregate_uncertainty_kw"],
                    })

            else:
                # DEFICIT INTERVAL: Demand exceeds solar!
                deficit_kw = abs(raw_net)
                available_batt = sim_battery.available_energy_kwh

                # Step B1: Discharge Community ESS (subject to reserve floor and power rating)
                if available_batt > 0.1 and sim_battery.soc_pct > sim_battery.min_reserve_pct:
                    dis_p, delivered, loss = sim_battery.discharge(deficit_kw, dt)
                    battery_discharge_kw = dis_p
                    total_battery_discharged_kwh += delivered
                    rem_deficit = max(0.0, deficit_kw - dis_p)

                    recommendations.append({
                        "interval": t_label,
                        "step_index": t,
                        "action_type": "DISCHARGE_COMMUNITY_ESS",
                        "target_power_kw": dis_p,
                        "energy_kwh": round(delivered, 3),
                        "reason": f"Discharging {dis_p} kW from Community ESS to shave deficit (SOC {start_soc:.1f}% -> {sim_battery.soc_pct:.1f}%).",
                        "financial_impact_inr": round(delivered * tariff_in, 2),
                        "financial_benefit_description": f"Directly avoids peak grid import at ₹{tariff_in:.2f}/kWh.",
                        "constraints_checked": f"Reserve floor guarded >= {sim_battery.min_reserve_pct}% ({sim_battery.min_reserve_kwh} kWh), max discharge rate ({sim_battery.max_discharge_power_kw} kW).",
                        "essential_load_protected": True,
                        "forecast_uncertainty_kw": iv["aggregate_uncertainty_kw"],
                    })
                else:
                    rem_deficit = deficit_kw

                # Step B2: Check Shortfall after Battery Support
                if rem_deficit > 0.001:
                    # Detect Shortfall
                    detected_shortfalls.append({
                        "interval": t_label,
                        "step_index": t,
                        "shortfall_kw": rem_deficit,
                        "hour": iv["hour_of_day"],
                        "essential_demand_kw": iv["forecast_essential_demand_kw"],
                        "flexible_demand_kw": iv["forecast_flexible_demand_kw"],
                        "battery_soc_at_shortfall": sim_battery.soc_pct,
                    })

                    # Step B3: Flexible Load Shifting (if enabled and eligible candidates exist)
                    if allow_flexible_load_shift and len(candidate_shift_hours) > 0 and iv["forecast_flexible_demand_kw"] > 0.2:
                        # Find the first candidate that still has positive headroom
                        eligible_candidate = None
                        for cand in candidate_shift_hours:
                            if cand["surplus_headroom_kw"] > 0.1:
                                eligible_candidate = cand
                                break

                        if eligible_candidate is not None:
                            shiftable_amount = min(rem_deficit, iv["forecast_flexible_demand_kw"], eligible_candidate["surplus_headroom_kw"])
                            if shiftable_amount > 0.1:
                                shifted_flex_kw = shiftable_amount
                                rem_deficit = max(0.0, rem_deficit - shiftable_amount)
                                total_shifted_load_kwh += shiftable_amount * dt
                                # Decrement candidate headroom to prevent double allocation of solar surplus
                                eligible_candidate["surplus_headroom_kw"] -= shiftable_amount
                                dest_idx = eligible_candidate["step_index"]
                                # Track received shifted load in destination interval for exact accounting
                                intervals_summary[dest_idx]["received_shifted_load_kw"] = (
                                    intervals_summary[dest_idx].get("received_shifted_load_kw", 0.0) + shiftable_amount
                                )

                                recommendations.append({
                                    "interval": t_label,
                                    "step_index": t,
                                    "action_type": "SHIFT_FLEXIBLE_LOAD",
                                    "target_power_kw": shiftable_amount,
                                    "energy_kwh": round(shiftable_amount * dt, 3),
                                    "destination_interval": eligible_candidate["time_label"],
                                    "reason": f"Advised shifting {shiftable_amount} kW flexible load (e.g. EV/laundry) from peak shortfall interval ({t_label}) to solar surplus interval ({eligible_candidate['time_label']}).",
                                    "financial_impact_inr": round(shiftable_amount * dt * (tariff_in - grid_export_feedin_per_kwh), 2),
                                    "financial_benefit_description": f"Avoids ₹{tariff_in:.2f}/kWh peak import by utilizing free local solar surplus in future interval.",
                                    "constraints_checked": "Only flexible load shifted; 100% of essential load remains continuously energized.",
                                    "essential_load_protected": True,
                                    "forecast_uncertainty_kw": iv["aggregate_uncertainty_kw"],
                                })
