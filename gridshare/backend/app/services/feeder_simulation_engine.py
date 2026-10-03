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

