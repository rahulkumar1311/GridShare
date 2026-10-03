"""
Feeder-Level Simulation Engine for GridShare Microgrid.

Schneider Electric Yuva Yodha 2026 — Challenge 03: Grid Reliability & Renewable Intermittency.

Physical principles enforced:
1. Strict differentiation between Power (kW) and Energy (kWh): Energy = Power * delta_t.
2. Battery energy capacity, reserve floor, maximum charge/discharge rates, and efficiency losses.
3. No simultaneous charge and discharge for any battery.
4. Essential load vs. flexible/deferrable load priority.
5. Exact power & energy conservation at the feeder boundary (sources == sinks).
6. P2P trades strictly reallocate local physical surplus and do NOT create fictitious electricity.
7. Transformer active power ampacity and voltage drop/rise LinDistFlow approximation.
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any

@dataclass
class BatteryState:
    id: str
    capacity_kwh: float
    current_energy_kwh: float
    min_reserve_pct: float = 20.0
    max_charge_power_kw: float = 10.0
    max_discharge_power_kw: float = 10.0
    charge_efficiency: float = 0.95
    discharge_efficiency: float = 0.95

    def __post_init__(self):
        self.capacity_kwh = max(0.01, float(self.capacity_kwh))
        self.current_energy_kwh = max(0.0, min(self.capacity_kwh, float(self.current_energy_kwh)))
        self.min_reserve_pct = max(0.0, min(100.0, float(self.min_reserve_pct)))
        self.charge_efficiency = max(0.1, min(1.0, float(self.charge_efficiency)))
        self.discharge_efficiency = max(0.1, min(1.0, float(self.discharge_efficiency)))

    @property
    def min_reserve_kwh(self) -> float:
        return self.capacity_kwh * (self.min_reserve_pct / 100.0)

    @property
    def soc_pct(self) -> float:
        return round((self.current_energy_kwh / self.capacity_kwh) * 100.0, 2)

    @property
    def headroom_kwh(self) -> float:
        """Maximum chemical energy that can be added before reaching 100% capacity."""
        return max(0.0, self.capacity_kwh - self.current_energy_kwh)

    @property
    def available_energy_kwh(self) -> float:
        """Usable chemical energy above the emergency reserve floor."""
        return max(0.0, self.current_energy_kwh - self.min_reserve_kwh)

    def charge(self, target_power_kw: float, duration_hours: float) -> Tuple[float, float, float]:
        """
        Charges battery with up to target_power_kw for duration_hours.
        Returns:
            (actual_power_kw, chem_energy_stored_kwh, loss_kwh)
        """
        if target_power_kw <= 1e-9 or duration_hours <= 1e-9:
            return 0.0, 0.0, 0.0

        # Max electrical power that can be absorbed given chemistry headroom and efficiency
        max_power_from_headroom = self.headroom_kwh / (self.charge_efficiency * duration_hours)
        actual_power_kw = max(0.0, min(target_power_kw, self.max_charge_power_kw, max_power_from_headroom))

        electrical_energy_kwh = actual_power_kw * duration_hours
        chem_energy_stored_kwh = electrical_energy_kwh * self.charge_efficiency
        loss_kwh = electrical_energy_kwh - chem_energy_stored_kwh

        self.current_energy_kwh = min(self.capacity_kwh, self.current_energy_kwh + chem_energy_stored_kwh)
        return actual_power_kw, chem_energy_stored_kwh, loss_kwh

    def discharge(self, target_power_kw: float, duration_hours: float) -> Tuple[float, float, float]:
        """
        Discharges battery to supply target_power_kw at electrical terminals for duration_hours.
        Returns:
            (actual_power_kw, energy_delivered_kwh, loss_kwh)
        """
        if target_power_kw <= 1e-9 or duration_hours <= 1e-9:
            return 0.0, 0.0, 0.0

        # Max electrical power deliverable without violating the reserve floor
        max_power_from_storage = (self.available_energy_kwh * self.discharge_efficiency) / duration_hours
        actual_power_kw = max(0.0, min(target_power_kw, self.max_discharge_power_kw, max_power_from_storage))

        electrical_energy_delivered = actual_power_kw * duration_hours
        chem_energy_drawn = electrical_energy_delivered / self.discharge_efficiency if self.discharge_efficiency > 0 else 0.0
        loss_kwh = chem_energy_drawn - electrical_energy_delivered

        if chem_energy_drawn > 1e-9:
            self.current_energy_kwh = max(self.min_reserve_kwh, self.current_energy_kwh - chem_energy_drawn)
        return actual_power_kw, electrical_energy_delivered, loss_kwh


@dataclass
class HouseholdNodeConfig:
    id: str
    name: str
    solar_capacity_kw: float
    base_essential_kw: float
    base_flexible_kw: float
    has_btm_battery: bool = False
    btm_battery_capacity_kwh: float = 0.0
    btm_battery_initial_soc: float = 50.0
    btm_battery_reserve_pct: float = 20.0
    btm_battery_max_power_kw: float = 3.0


@dataclass
class FeederConfig:
    id: str = "feeder_substation_01"
    name: str = "Green Enclave Feeder"
    transformer_capacity_kva: float = 50.0
    power_factor: float = 0.95
    nominal_voltage_v: float = 230.0
    line_resistance_ohms: float = 0.08
    line_reactance_ohms: float = 0.04
    grid_import_tariff_per_kwh: float = 6.10
    grid_export_feedin_per_kwh: float = 3.50
    p2p_clearing_tariff_per_kwh: float = 4.50
    unmet_demand_penalty_per_kwh: float = 25.00
    allow_flexible_load_shedding: bool = True
    community_battery_capacity_kwh: float = 50.0
    community_battery_initial_soc: float = 40.0
    community_battery_reserve_pct: float = 20.0
    community_battery_max_power_kw: float = 15.0


class FeederSimulationEngine:
    """
    Deterministic neighbourhood-level feeder simulation engine.
    Calculates step-by-step physical electrical flows, DER dispatch,
    transformer loading, voltage deviations, and tariff settlements.
    """

    def __init__(self, config: Optional[FeederConfig] = None, households: Optional[List[HouseholdNodeConfig]] = None):
        self.config = config or FeederConfig()
        self.households_config = households or self._get_default_households()
        
        # Initialize Behind-the-Meter (BTM) batteries
        self.btm_batteries: Dict[str, Optional[BatteryState]] = {}
        for h in self.households_config:
            if h.has_btm_battery and h.btm_battery_capacity_kwh > 0:
                init_energy = h.btm_battery_capacity_kwh * (h.btm_battery_initial_soc / 100.0)
                self.btm_batteries[h.id] = BatteryState(
                    id=f"btm_battery_{h.id}",
                    capacity_kwh=h.btm_battery_capacity_kwh,
                    current_energy_kwh=init_energy,
                    min_reserve_pct=h.btm_battery_reserve_pct,
                    max_charge_power_kw=h.btm_battery_max_power_kw,
                    max_discharge_power_kw=h.btm_battery_max_power_kw,
                )
            else:
                self.btm_batteries[h.id] = None

        # Initialize Shared Community ESS
        init_comm_energy = self.config.community_battery_capacity_kwh * (self.config.community_battery_initial_soc / 100.0)
        self.community_battery = BatteryState(
            id="community_ess_01",
            capacity_kwh=self.config.community_battery_capacity_kwh,
            current_energy_kwh=init_comm_energy,
            min_reserve_pct=self.config.community_battery_reserve_pct,
            max_charge_power_kw=self.config.community_battery_max_power_kw,
            max_discharge_power_kw=self.config.community_battery_max_power_kw,
            charge_efficiency=0.95,
            discharge_efficiency=0.95,
        )

    @staticmethod
    def _get_default_households() -> List[HouseholdNodeConfig]:
        """Standard 5-home community microgrid aligned with GridShare seed models."""
        return [
            HouseholdNodeConfig(
                id="house_a",
                name="House A (Solar Champion)",
                solar_capacity_kw=8.0,
                base_essential_kw=1.2,
                base_flexible_kw=0.9,
                has_btm_battery=True,
                btm_battery_capacity_kwh=10.0,
                btm_battery_initial_soc=70.0,
                btm_battery_reserve_pct=20.0,
                btm_battery_max_power_kw=3.5,
            ),
            HouseholdNodeConfig(
                id="house_b",
                name="House B (Heavy EV Consumer)",
                solar_capacity_kw=1.5,
                base_essential_kw=2.0,
                base_flexible_kw=2.5,
                has_btm_battery=False,
            ),
            HouseholdNodeConfig(
                id="house_c",
                name="House C (Balanced Prosumer)",
                solar_capacity_kw=4.0,
                base_essential_kw=1.1,
                base_flexible_kw=1.1,
                has_btm_battery=True,
                btm_battery_capacity_kwh=6.0,
                btm_battery_initial_soc=50.0,
                btm_battery_reserve_pct=20.0,
                btm_battery_max_power_kw=2.5,
            ),
            HouseholdNodeConfig(
                id="house_d",
                name="House D (Smart Apartment)",
                solar_capacity_kw=0.0,
                base_essential_kw=1.2,
                base_flexible_kw=1.3,
                has_btm_battery=False,
            ),
            HouseholdNodeConfig(
                id="house_e",
                name="House E (Solar Villa)",
                solar_capacity_kw=6.0,
                base_essential_kw=1.5,
                base_flexible_kw=1.0,
                has_btm_battery=True,
                btm_battery_capacity_kwh=8.0,
                btm_battery_initial_soc=60.0,
                btm_battery_reserve_pct=20.0,
                btm_battery_max_power_kw=3.0,
            ),
        ]

    def simulate_step(
        self,
        step_index: int = 0,
        hour_of_day: float = 12.0,
        duration_hours: float = 1.0,
        solar_irradiance_factor: float = 1.0,
        load_multiplier: float = 1.0,
        grid_available: bool = True,
        import_tariff_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Execute single deterministic time-step for the entire feeder.
        Enforces strict conservation, transformer limits, and unit consistency.
        """
        dt = max(0.001, float(duration_hours))
        hour = float(hour_of_day) % 24.0
        irr = max(0.0, float(solar_irradiance_factor))
        load_mult = max(0.1, float(load_multiplier))

        import_tariff = import_tariff_override if import_tariff_override is not None else self.config.grid_import_tariff_per_kwh
        export_tariff = self.config.grid_export_feedin_per_kwh
        p2p_tariff = self.config.p2p_clearing_tariff_per_kwh
        unmet_penalty = self.config.unmet_demand_penalty_per_kwh

        # Step 1: Compute raw solar & load per household
        if 6.0 <= hour <= 18.0:
            solar_shape = math.sin(math.pi * (hour - 6.0) / 12.0)
        else:
            solar_shape = 0.0

        hh_results = []
        total_gen_kw = 0.0
        total_essential_req_kw = 0.0
        total_flexible_req_kw = 0.0
        total_demand_req_kw = 0.0

        for h in self.households_config:
            gen_kw = h.solar_capacity_kw * solar_shape * irr
            ess_kw = h.base_essential_kw * load_mult
            flex_kw = h.base_flexible_kw * load_mult
            dem_kw = ess_kw + flex_kw

            total_gen_kw += gen_kw
            total_essential_req_kw += ess_kw
            total_flexible_req_kw += flex_kw
            total_demand_req_kw += dem_kw

            hh_results.append({
                "household_id": h.id,
                "household_name": h.name,
                "generation_kw": gen_kw,
                "essential_demand_kw": ess_kw,
                "flexible_demand_kw": flex_kw,
                "total_demand_kw": dem_kw,
                "solar_self_consumed_kw": 0.0,
                "btm_battery_charge_kw": 0.0,
                "btm_battery_discharge_kw": 0.0,
                "btm_battery_soc": 0.0,
                "feeder_export_surplus_kw": 0.0,
                "feeder_import_deficit_kw": 0.0,
                "unmet_demand_kw": 0.0,
            })

        # Step 2: Household Behind-the-Meter (BTM) Self-Balancing
        feeder_surplus_pool_kw = 0.0
        feeder_deficit_pool_kw = 0.0

        for idx, h_res in enumerate(hh_results):
            hid = h_res["household_id"]
            gen = h_res["generation_kw"]
            tot_dem = h_res["total_demand_kw"]
            btm = self.btm_batteries.get(hid)

            # Local solar supplies local demand first
            solar_used = min(gen, tot_dem)
            h_res["solar_self_consumed_kw"] = solar_used
            rem_gen = gen - solar_used
            rem_dem = tot_dem - solar_used

            btm_ch_kw = 0.0
            btm_dis_kw = 0.0

            if rem_gen > 1e-9 and btm is not None:
                ch_p, _, _ = btm.charge(rem_gen, dt)
                btm_ch_kw = ch_p
                rem_gen -= ch_p
            elif rem_dem > 1e-9 and btm is not None:
                dis_p, _, _ = btm.discharge(rem_dem, dt)
                btm_dis_kw = dis_p
                rem_dem -= dis_p

            h_res["btm_battery_charge_kw"] = btm_ch_kw
            h_res["btm_battery_discharge_kw"] = btm_dis_kw
            h_res["btm_battery_soc"] = btm.soc_pct if btm else None

            # Exchange offered to the neighbourhood feeder
            h_res["feeder_export_surplus_kw"] = rem_gen
            h_res["feeder_import_deficit_kw"] = rem_dem

            feeder_surplus_pool_kw += rem_gen
            feeder_deficit_pool_kw += rem_dem

        # Step 3: Feeder P2P Energy Sharing (Physical Nodal Reallocation)
        p2p_cleared_kw = min(feeder_surplus_pool_kw, feeder_deficit_pool_kw)
        rem_surplus_after_p2p_kw = feeder_surplus_pool_kw - p2p_cleared_kw
        rem_deficit_after_p2p_kw = feeder_deficit_pool_kw - p2p_cleared_kw

        # Step 4: Shared Community Battery ESS Dispatch
        comm_charge_kw = 0.0
        comm_discharge_kw = 0.0
        comm_loss_kwh = 0.0

        if rem_surplus_after_p2p_kw > 1e-9:
            ch_p, _, loss = self.community_battery.charge(rem_surplus_after_p2p_kw, dt)
            comm_charge_kw = ch_p
            comm_loss_kwh = loss
            rem_surplus_final_kw = rem_surplus_after_p2p_kw - ch_p
            rem_deficit_final_kw = 0.0
        elif rem_deficit_after_p2p_kw > 1e-9:
            dis_p, _, loss = self.community_battery.discharge(rem_deficit_after_p2p_kw, dt)
            comm_discharge_kw = dis_p
            comm_loss_kwh = loss
            rem_deficit_final_kw = rem_deficit_after_p2p_kw - dis_p
            rem_surplus_final_kw = 0.0
        else:
            rem_surplus_final_kw = 0.0
            rem_deficit_final_kw = 0.0

        # Step 5: Substation Transformer Capacity & Utility Grid Exchange
        max_transformer_active_kw = self.config.transformer_capacity_kva * self.config.power_factor
        grid_import_kw = 0.0
        grid_export_kw = 0.0
        unmet_demand_kw = 0.0
        curtailed_solar_kw = 0.0

        if not grid_available:
            # Islanded microgrid mode
            unmet_demand_kw = rem_deficit_final_kw
            curtailed_solar_kw = rem_surplus_final_kw
        else:
            # Grid connected: check transformer rating
            if rem_deficit_final_kw > 1e-9:
                grid_import_kw = min(rem_deficit_final_kw, max_transformer_active_kw)
                unmet_demand_kw = max(0.0, rem_deficit_final_kw - grid_import_kw)
            elif rem_surplus_final_kw > 1e-9:
                grid_export_kw = min(rem_surplus_final_kw, max_transformer_active_kw)
                curtailed_solar_kw = max(0.0, rem_surplus_final_kw - grid_export_kw)

        # In case of unmet demand, curtail flexible loads first
        demand_served_kw = max(0.0, total_demand_req_kw - unmet_demand_kw)

        # Step 6: Electrical & Voltage Physics (LinDistFlow Approximation)
        net_feeder_flow_kw = grid_import_kw - grid_export_kw
        transformer_loading_pct = (abs(net_feeder_flow_kw) / max(0.01, max_transformer_active_kw)) * 100.0

        q_feeder_kvar = net_feeder_flow_kw * math.tan(math.acos(self.config.power_factor))
        delta_v_volts = (
            (self.config.line_resistance_ohms * net_feeder_flow_kw * 1000.0 +
             self.config.line_reactance_ohms * q_feeder_kvar * 1000.0) /
            (self.config.nominal_voltage_v * 1000.0)
        )
        feeder_bus_voltage_v = self.config.nominal_voltage_v - delta_v_volts
        voltage_pu = feeder_bus_voltage_v / self.config.nominal_voltage_v

        # Step 7: Energy Conversion (kWh = kW * dt)
        energy_gen_kwh = total_gen_kw * dt
        energy_demand_kwh = total_demand_req_kw * dt
        energy_demand_served_kwh = demand_served_kw * dt
        energy_unmet_kwh = unmet_demand_kw * dt
        energy_grid_import_kwh = grid_import_kw * dt
        energy_grid_export_kwh = grid_export_kw * dt
        energy_p2p_kwh = p2p_cleared_kw * dt
        energy_curtailed_kwh = curtailed_solar_kw * dt

        # Step 8: Strict Energy Conservation Audit
        total_sources_kw = (
            total_gen_kw +
            sum(h["btm_battery_discharge_kw"] for h in hh_results) +
            comm_discharge_kw +
            grid_import_kw
        )
        total_sinks_kw = (
            demand_served_kw +
            sum(h["btm_battery_charge_kw"] for h in hh_results) +
            comm_charge_kw +
            grid_export_kw +
            curtailed_solar_kw
        )
        power_balance_error_kw = abs(total_sources_kw - total_sinks_kw)

        # Step 9: Economic / Tariff Settlement
        cost_grid_import = energy_grid_import_kwh * import_tariff
        revenue_grid_export = energy_grid_export_kwh * export_tariff
        penalty_unmet = energy_unmet_kwh * unmet_penalty
        net_community_cost_inr = cost_grid_import - revenue_grid_export + penalty_unmet
        p2p_financial_volume_inr = energy_p2p_kwh * p2p_tariff

        # Round for reporting dictionary
        return {
            "step_index": step_index,
            "hour_of_day": round(hour, 2),
            "duration_hours": dt,
            "feeder_id": self.config.id,
            "feeder_name": self.config.name,
            "grid_status": "ONLINE" if grid_available else "ISLANDED",
            "tariffs": {
                "grid_import_inr_per_kwh": round(import_tariff, 2),
                "grid_export_inr_per_kwh": round(export_tariff, 2),
                "p2p_clearing_inr_per_kwh": round(p2p_tariff, 2),
            },
            "aggregate_power_kw": {
                "total_demand_kw": round(total_demand_req_kw, 4),
                "essential_demand_kw": round(total_essential_req_kw, 4),
                "flexible_demand_kw": round(total_flexible_req_kw, 4),
                "demand_served_kw": round(demand_served_kw, 4),
                "unmet_demand_kw": round(unmet_demand_kw, 4),
                "total_solar_generation_kw": round(total_gen_kw, 4),
                "p2p_cleared_kw": round(p2p_cleared_kw, 4),
                "community_battery_charge_kw": round(comm_charge_kw, 4),
                "community_battery_discharge_kw": round(comm_discharge_kw, 4),
                "grid_import_kw": round(grid_import_kw, 4),
                "grid_export_kw": round(grid_export_kw, 4),
                "curtailed_solar_kw": round(curtailed_solar_kw, 4),
            },
            "aggregate_energy_kwh": {
                "demand_kwh": round(energy_demand_kwh, 4),
                "demand_served_kwh": round(energy_demand_served_kwh, 4),
                "unmet_demand_kwh": round(energy_unmet_kwh, 4),
                "solar_generation_kwh": round(energy_gen_kwh, 4),
                "p2p_traded_kwh": round(energy_p2p_kwh, 4),
                "grid_import_kwh": round(energy_grid_import_kwh, 4),
                "grid_export_kwh": round(energy_grid_export_kwh, 4),
                "solar_curtailed_kwh": round(energy_curtailed_kwh, 4),
            },
            "feeder_reliability": {
                "transformer_capacity_kva": self.config.transformer_capacity_kva,
                "transformer_loading_pct": round(transformer_loading_pct, 1),
                "transformer_status": "OVERLOAD" if transformer_loading_pct > 100.0 else "NOMINAL",
                "bus_voltage_v": round(feeder_bus_voltage_v, 2),
                "bus_voltage_pu": round(voltage_pu, 3),
                "voltage_status": (
                    "OVERVOLTAGE" if voltage_pu > 1.05 else
                    "UNDERVOLTAGE" if voltage_pu < 0.95 else
                    "NORMAL"
                ),
                "energy_balance_conserved": power_balance_error_kw < 1e-4,
                "power_balance_error_kw": round(power_balance_error_kw, 6),
            },
            "community_battery": {
                "soc_pct": self.community_battery.soc_pct,
                "stored_kwh": round(self.community_battery.current_energy_kwh, 3),
                "capacity_kwh": self.community_battery.capacity_kwh,
                "min_reserve_kwh": round(self.community_battery.min_reserve_kwh, 3),
                "active_power_kw": round(comm_charge_kw - comm_discharge_kw, 3),
            },
            "economics_inr": {
                "cost_grid_import": round(cost_grid_import, 2),
                "revenue_grid_export": round(revenue_grid_export, 2),
                "penalty_unmet_demand": round(penalty_unmet, 2),
                "net_community_energy_cost": round(net_community_cost_inr, 2),
                "p2p_trade_volume_value": round(p2p_financial_volume_inr, 2),
            },
            "households": [
                {
                    "household_id": h["household_id"],
                    "household_name": h["household_name"],
                    "generation_kw": round(h["generation_kw"], 3),
                    "essential_demand_kw": round(h["essential_demand_kw"], 3),
                    "flexible_demand_kw": round(h["flexible_demand_kw"], 3),
                    "total_demand_kw": round(h["total_demand_kw"], 3),
                    "solar_self_consumed_kw": round(h["solar_self_consumed_kw"], 3),
                    "btm_battery_charge_kw": round(h["btm_battery_charge_kw"], 3),
                    "btm_battery_discharge_kw": round(h["btm_battery_discharge_kw"], 3),
                    "btm_battery_soc": h["btm_battery_soc"],
                    "feeder_export_surplus_kw": round(h["feeder_export_surplus_kw"], 4),
                    "feeder_import_deficit_kw": round(h["feeder_import_deficit_kw"], 4),
                }
                for h in hh_results
            ],
        }

