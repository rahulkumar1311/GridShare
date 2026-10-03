"""
Reproducible Baseline vs GridShare Evaluation Service.

Schneider Electric Yuva Yodha 2026 — Challenge 03: Grid Reliability & Renewable Intermittency.

Rigorous evaluation harness:
- Completely deterministic inputs (solar irradiance, demand profiles, tariffs, battery parameters).
- Identical simulation inputs supplied to both Baseline and GridShare strategies.
- Enforces physical energy conservation, battery physics, and transformer limits.
- Zero division protection for all metric calculations.
- Distinguishes clearly between forecast, simulated physical outcomes, and uncoordinated baselines.
- Covers 6 deterministic scenarios including failure/unmet demand cases.
"""

import math
import time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict

from gridshare.backend.app.services.feeder_simulation_engine import (
    FeederConfig,
    HouseholdNodeConfig,
    BatteryState,
    FeederSimulationEngine,
)


@dataclass
class ScenarioDefinition:
    scenario_id: str
    name: str
    description: str
    duration_hours: int = 24
    step_duration_hours: float = 1.0
    solar_multiplier: float = 1.0
    demand_multiplier: float = 1.0
    initial_battery_soc: float = 50.0
    battery_capacity_kwh: float = 50.0
    battery_reserve_pct: float = 20.0
    battery_max_power_kw: float = 15.0
    transformer_capacity_kva: float = 50.0
    allow_load_shifting: bool = True
    # Specific hourly profiles or overrides
    hourly_solar_factors: Optional[List[float]] = None
    hourly_demand_factors: Optional[List[float]] = None


class FeederEvaluationService:
    """
    Executes reproducible, side-by-side comparative evaluations of
    Baseline (uncoordinated) vs GridShare (forecast-coordinated) strategies.
    """

    @classmethod
    def get_standard_scenarios(cls) -> List[ScenarioDefinition]:
        """
        Returns the 6 deterministic test scenarios mandated for Challenge 03 evaluation.
        """
        # Scenario 1: Normal solar availability
        s1 = ScenarioDefinition(
            scenario_id="scenario_1_normal",
            name="1. Normal Solar Availability",
            description="Standard clear-sky diurnal solar generation, nominal household demand, balanced 50% initial battery SOC.",
            solar_multiplier=1.0,
            demand_multiplier=1.0,
            initial_battery_soc=50.0,
            battery_capacity_kwh=50.0,
            transformer_capacity_kva=50.0,
        )

        # Scenario 2: Sudden or sustained solar reduction (monsoon overcast)
        s2 = ScenarioDefinition(
            scenario_id="scenario_2_solar_drop",
            name="2. Sustained Solar Reduction",
            description="Severe 80% reduction in solar irradiance (cloud/overcast across all daytime hours), testing intermittency mitigation.",
            solar_multiplier=0.20,
            demand_multiplier=1.0,
            initial_battery_soc=50.0,
            battery_capacity_kwh=50.0,
            transformer_capacity_kva=50.0,
        )

        # Scenario 3: Evening demand peak
        # Spikes demand between hours 17 and 22 to 1.85x
        evening_factors = [1.0] * 24
        for h in range(17, 23):
            evening_factors[h] = 1.85
        s3 = ScenarioDefinition(
            scenario_id="scenario_3_evening_peak",
            name="3. Evening Demand Peak",
            description="High evening consumption spike (1.85x multiplier from 17:00 to 22:00) during peak TOU tariff hours.",
            solar_multiplier=1.0,
            demand_multiplier=1.0,
            initial_battery_soc=60.0,
            battery_capacity_kwh=50.0,
            transformer_capacity_kva=50.0,
            hourly_demand_factors=evening_factors,
        )

        # Scenario 4: Low initial battery SOC
        s4 = ScenarioDefinition(
            scenario_id="scenario_4_low_soc",
            name="4. Low Initial Battery SOC",
            description="Initial battery SOC begins at the critical 20.0% reserve floor (0 kWh usable discharge energy available at t=0).",
            solar_multiplier=1.0,
            demand_multiplier=1.0,
            initial_battery_soc=20.0,
            battery_capacity_kwh=50.0,
            battery_reserve_pct=20.0,
            transformer_capacity_kva=50.0,
        )

        # Scenario 5: High demand with constrained battery capacity
        s5 = ScenarioDefinition(
            scenario_id="scenario_5_constrained_battery",
            name="5. High Demand & Constrained Battery",
            description="Feeder demand doubled (2.2x), coupled with severely downsized community battery (15 kWh capacity, 5 kW inverter).",
            solar_multiplier=1.0,
            demand_multiplier=2.2,
            initial_battery_soc=50.0,
            battery_capacity_kwh=15.0,
            battery_max_power_kw=5.0,
            transformer_capacity_kva=50.0,
        )

        # Scenario 6: Insufficient resources with remaining unmet demand
        s6 = ScenarioDefinition(
            scenario_id="scenario_6_unmet_demand",
            name="6. Insufficient Resources (Unmet Demand)",
            description="Zero solar (night storm), 3.5x demand overload, depleted battery (20% SOC), and constrained 30 kVA transformer.",
            solar_multiplier=0.0,
            demand_multiplier=3.5,
            initial_battery_soc=20.0,
            battery_capacity_kwh=50.0,
            battery_reserve_pct=20.0,
            transformer_capacity_kva=30.0,  # 28.5 kW active limit
        )

        return [s1, s2, s3, s4, s5, s6]

    @classmethod
    def generate_input_series(
        cls,
        scenario: ScenarioDefinition,
        households: List[HouseholdNodeConfig],
    ) -> List[Dict[str, Any]]:
        """
        Generates identical, deterministic input time-series for a scenario.
        Both Baseline and GridShare receive this exact identical sequence.
        """
        time_series = []
        dt = scenario.step_duration_hours

        for step in range(scenario.duration_hours):
            hour = (step * dt) % 24.0

            # Solar irradiance factor
            if scenario.hourly_solar_factors is not None and step < len(scenario.hourly_solar_factors):
                irr = scenario.hourly_solar_factors[step]
            else:
                irr = scenario.solar_multiplier

            # Diurnal solar shape
            if 6.0 <= hour <= 18.0:
                diurnal_solar = math.sin(math.pi * (hour - 6.0) / 12.0)
            else:
                diurnal_solar = 0.0

            # Demand multiplier
            if scenario.hourly_demand_factors is not None and step < len(scenario.hourly_demand_factors):
                d_mult = scenario.hourly_demand_factors[step] * scenario.demand_multiplier
            else:
                d_mult = scenario.demand_multiplier

            # TOU Tariff structure
            is_peak = (18.0 <= hour <= 22.0)
            import_tariff = 8.50 if is_peak else 6.10
            export_tariff = 3.50

            hh_inputs = []
            total_solar_kw = 0.0
            total_essential_kw = 0.0
            total_flexible_kw = 0.0

            for h in households:
                solar_kw = h.solar_capacity_kw * diurnal_solar * irr
                ess_kw = h.base_essential_kw * d_mult
                flex_kw = h.base_flexible_kw * d_mult
                tot_kw = ess_kw + flex_kw

                total_solar_kw += solar_kw
                total_essential_kw += ess_kw
                total_flexible_kw += flex_kw

                hh_inputs.append({
                    "household_id": h.id,
                    "solar_kw": solar_kw,
                    "essential_demand_kw": ess_kw,
                    "flexible_demand_kw": flex_kw,
                    "total_demand_kw": tot_kw,
                })

            time_series.append({
                "step_index": step,
                "hour_of_day": hour,
                "duration_hours": dt,
                "import_tariff": import_tariff,
                "export_tariff": export_tariff,
                "total_solar_kw": total_solar_kw,
                "total_essential_kw": total_essential_kw,
                "total_flexible_kw": total_flexible_kw,
                "total_demand_kw": total_essential_kw + total_flexible_kw,
                "households": hh_inputs,
            })

        return time_series

    @classmethod
    def simulate_baseline_strategy(
        cls,
        scenario: ScenarioDefinition,
        time_series: List[Dict[str, Any]],
        households: List[HouseholdNodeConfig],
    ) -> Dict[str, Any]:
        """
        Executes BASELINE Strategy:
        - Local solar self-use enabled behind-the-meter.
        - Flexible loads are NOT shifted (run at customer's native scheduled times).
        - P2P energy trading is NOT coordinated (excess local solar is simply injected as export).
        - Community battery is UNMANAGED / IDLE (no predictive lookahead or TOU dispatch).
        - Essential load is not segregated during shedding: transformer capacity limits drop loads indiscriminately.
        """
        start_time = time.perf_counter()
        dt = scenario.step_duration_hours
        max_xfmr_kw = scenario.transformer_capacity_kva * 0.95

        # Initialize community battery at scenario initial SOC (remains unmanaged/idle in baseline)
        comm_battery = BatteryState(
            id="baseline_comm_battery",
            capacity_kwh=scenario.battery_capacity_kwh,
            current_energy_kwh=scenario.battery_capacity_kwh * (scenario.initial_battery_soc / 100.0),
            min_reserve_pct=scenario.battery_reserve_pct,
            max_charge_power_kw=scenario.battery_max_power_kw,
            max_discharge_power_kw=scenario.battery_max_power_kw,
        )

        steps_output = []
        for step_data in time_series:
            t = step_data["step_index"]
            hour = step_data["hour_of_day"]
            imp_tariff = step_data["import_tariff"]
            exp_tariff = step_data["export_tariff"]

            total_solar_kw = step_data["total_solar_kw"]
            total_demand_kw = step_data["total_demand_kw"]
            total_essential_kw = step_data["total_essential_kw"]
            total_flexible_kw = step_data["total_flexible_kw"]

            # 1. Household behind-the-meter solar self-use
            feeder_surplus_kw = 0.0
            feeder_deficit_kw = 0.0
            total_solar_self_used_kw = 0.0

            for h_in in step_data["households"]:
                sol = h_in["solar_kw"]
                dem = h_in["total_demand_kw"]
                self_used = min(sol, dem)
                total_solar_self_used_kw += self_used

                surplus = sol - self_used
                deficit = dem - self_used

                feeder_surplus_kw += surplus
                feeder_deficit_kw += deficit

            # In uncoordinated baseline, community battery is idle
            comm_batt_chg_kw = 0.0
            comm_batt_dis_kw = 0.0

            # Transformer exchange
            grid_import_kw = 0.0
            grid_export_kw = 0.0
            unmet_demand_kw = 0.0
            curtailed_solar_kw = 0.0

            # Net position of the feeder
            net_deficit_kw = feeder_deficit_kw
            net_surplus_kw = feeder_surplus_kw

            # Even in uncoordinated baseline, electricity on the same low-voltage feeder
            # naturally self-balances aggregate prosumer injection with consumer load:
            feeder_natural_offset = min(net_surplus_kw, net_deficit_kw)
            rem_deficit_kw = net_deficit_kw - feeder_natural_offset
            rem_surplus_kw = net_surplus_kw - feeder_natural_offset

            if rem_deficit_kw > 1e-9:
                grid_import_kw = min(rem_deficit_kw, max_xfmr_kw)
                unmet_demand_kw = max(0.0, rem_deficit_kw - grid_import_kw)
            elif rem_surplus_kw > 1e-9:
                grid_export_kw = min(rem_surplus_kw, max_xfmr_kw)
                curtailed_solar_kw = max(0.0, rem_surplus_kw - grid_export_kw)

            demand_served_kw = max(0.0, total_demand_kw - unmet_demand_kw)

            # In baseline, load shedding is unmanaged: if unmet demand occurs,
            # essential load is violated proportionally
            if unmet_demand_kw > 1e-6 and total_demand_kw > 1e-6:
                unmet_essential_kw = unmet_demand_kw * (total_essential_kw / total_demand_kw)
            else:
                unmet_essential_kw = 0.0

            # Economics
            import_cost = (grid_import_kw * dt) * imp_tariff
            export_rev = (grid_export_kw * dt) * exp_tariff
            net_cost = import_cost - export_rev

            # Energy balance verification (sources vs sinks)
            sources = total_solar_kw + comm_batt_dis_kw + grid_import_kw
            sinks = demand_served_kw + comm_batt_chg_kw + grid_export_kw + curtailed_solar_kw
            balance_residual = abs(sources - sinks)

            # Renewable self-consumption
            renewable_self_consumed_kw = total_solar_kw - grid_export_kw - curtailed_solar_kw

            steps_output.append({
                "step_index": t,
                "hour_of_day": hour,
                "total_demand_kw": total_demand_kw,
                "total_essential_kw": total_essential_kw,
                "total_flexible_kw": total_flexible_kw,
                "demand_served_kw": demand_served_kw,
                "unmet_demand_kw": unmet_demand_kw,
                "unmet_essential_kw": unmet_essential_kw,
                "total_solar_kw": total_solar_kw,
                "renewable_self_consumed_kw": renewable_self_consumed_kw,
                "curtailed_solar_kw": curtailed_solar_kw,
                "battery_charge_kw": comm_batt_chg_kw,
                "battery_discharge_kw": comm_batt_dis_kw,
                "battery_soc_pct": comm_battery.soc_pct,
                "grid_import_kw": grid_import_kw,
                "grid_export_kw": grid_export_kw,
                "energy_cost_inr": net_cost,
                "balance_residual_kw": balance_residual,
                "reserve_violated": comm_battery.soc_pct < (comm_battery.min_reserve_pct - 1e-4),
                "essential_violated": unmet_essential_kw > 1e-4,
            })

        runtime_ms = (time.perf_counter() - start_time) * 1000.0

        metrics = cls._calculate_strategy_metrics(steps_output, dt, runtime_ms)
        return {
            "strategy": "BASELINE",
            "description": "Uncoordinated feeder without load shifting or predictive battery dispatch.",
            "metrics": metrics,
            "steps": steps_output,
        }

    @classmethod
    def simulate_gridshare_strategy(
        cls,
        scenario: ScenarioDefinition,
        time_series: List[Dict[str, Any]],
        households: List[HouseholdNodeConfig],
    ) -> Dict[str, Any]:
        """
        Executes GRIDSHARE Strategy:
        - Predictive lookahead coordination.
        - Flexible load shifting: shifts deferrable loads to midday solar surplus hours (11:00-14:00).
        - Predictive community battery dispatch: charges from solar surplus, discharges during shortfalls/peak tariffs.
        - Battery reserve floor (20%) strictly enforced.
        - Essential load protected: in overload conditions, flexible loads are shed first before touching essential loads.
        """
        start_time = time.perf_counter()
        dt = scenario.step_duration_hours
        max_xfmr_kw = scenario.transformer_capacity_kva * 0.95

        # Initialize community battery
        comm_battery = BatteryState(
            id="gridshare_comm_battery",
            capacity_kwh=scenario.battery_capacity_kwh,
            current_energy_kwh=scenario.battery_capacity_kwh * (scenario.initial_battery_soc / 100.0),
            min_reserve_pct=scenario.battery_reserve_pct,
            max_charge_power_kw=scenario.battery_max_power_kw,
            max_discharge_power_kw=scenario.battery_max_power_kw,
            charge_efficiency=0.95,
            discharge_efficiency=0.95,
        )

        # Step 1: Detect surplus intervals (midday solar) to receive shifted flexible loads
        surplus_hours = []
        for step_data in time_series:
            net_est = step_data["total_solar_kw"] - step_data["total_demand_kw"]
            if net_est > 1.0:
                surplus_hours.append(step_data["step_index"])

        # Determine flexible load shifts (from peak hours to midday surplus)
        shifted_loads_kw = [0.0] * len(time_series)
        received_loads_kw = [0.0] * len(time_series)

        if scenario.allow_load_shifting and len(surplus_hours) > 0:
            for step_data in time_series:
                t = step_data["step_index"]
                hour = step_data["hour_of_day"]
                # Shift loads during evening peak or high shortfall hours
                if (17.0 <= hour <= 22.0) and step_data["total_solar_kw"] < step_data["total_demand_kw"]:
                    # Candidate shiftable load = flexible demand up to 60%
                    shift_amount = step_data["total_flexible_kw"] * 0.60
                    if shift_amount > 0.1:
                        shifted_loads_kw[t] = shift_amount
                        # Allocate evenly across available surplus hours
                        for target_h in surplus_hours:
                            received_loads_kw[target_h] += shift_amount / len(surplus_hours)

        steps_output = []
        for step_data in time_series:
            t = step_data["step_index"]
            hour = step_data["hour_of_day"]
            imp_tariff = step_data["import_tariff"]
            exp_tariff = step_data["export_tariff"]
            is_peak_tariff = (18.0 <= hour <= 22.0)

            total_solar_kw = step_data["total_solar_kw"]
            base_demand_kw = step_data["total_demand_kw"]
            total_essential_kw = step_data["total_essential_kw"]
            total_flexible_kw = step_data["total_flexible_kw"]

            # Adjusted demand after load shift
            adjusted_flexible_kw = max(0.0, total_flexible_kw - shifted_loads_kw[t] + received_loads_kw[t])
            adjusted_demand_kw = total_essential_kw + adjusted_flexible_kw

            # Behind-the-meter and feeder-level balance
            raw_net_balance_kw = total_solar_kw - adjusted_demand_kw

            comm_batt_chg_kw = 0.0
            comm_batt_dis_kw = 0.0
            grid_import_kw = 0.0
            grid_export_kw = 0.0
            curtailed_solar_kw = 0.0
            unmet_demand_kw = 0.0

            if raw_net_balance_kw > 1e-9:
                # Solar surplus: charge community battery
                headroom = comm_battery.headroom_kwh
                if headroom > 0.05 and comm_battery.soc_pct < 98.0:
                    ch_p, _, _ = comm_battery.charge(raw_net_balance_kw, dt)
                    comm_batt_chg_kw = ch_p
                    rem_surplus = raw_net_balance_kw - ch_p
                else:
                    rem_surplus = raw_net_balance_kw

                if rem_surplus > 1e-9:
                    grid_export_kw = min(rem_surplus, max_xfmr_kw)
                    curtailed_solar_kw = max(0.0, rem_surplus - grid_export_kw)

            elif raw_net_balance_kw < -1e-9:
                # Deficit:
                deficit_kw = abs(raw_net_balance_kw)
                # Forecast-driven coordination logic:
                # Prioritize battery discharge during:
                # 1) Peak tariff hours (18:00 - 22:00)
                # 2) Evening ramp hours (17:00 - 23:00)
                # 3) Emergency overload where deficit exceeds transformer rating
                # Off-peak early morning (00:00 - 06:00) preserves battery capacity for high-value peak shaving!
                should_discharge = is_peak_tariff or (17.0 <= hour <= 23.0) or (deficit_kw > max_xfmr_kw * 0.8) or (scenario.solar_multiplier <= 0.25)
                
                if should_discharge and comm_battery.available_energy_kwh > 0.05:
                    dis_p, _, _ = comm_battery.discharge(deficit_kw, dt)
                    comm_batt_dis_kw = dis_p
                    rem_deficit = max(0.0, deficit_kw - dis_p)
                else:
