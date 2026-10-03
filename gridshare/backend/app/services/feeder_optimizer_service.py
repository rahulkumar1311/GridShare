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

