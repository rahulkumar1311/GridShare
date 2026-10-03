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

