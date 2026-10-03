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


