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
