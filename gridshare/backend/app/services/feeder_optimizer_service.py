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
