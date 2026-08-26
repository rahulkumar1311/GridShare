"""
Feature Engineering for Household Short-Term Energy Demand Forecasting.
Creates temporal, lag, rolling statistical, and environmental features.
"""

import pandas as pd
import numpy as np

FEATURE_COLUMNS = [
    "hour",
    "day_of_week",
    "is_weekend",
    "sin_hour",
    "cos_hour",
    "lag_1h",
    "lag_2h",
    "lag_3h",
    "rolling_mean_3h",
    "rolling_std_3h",
    "generation_kw",
    "grid_price",
]

def engineer_features(df: pd.DataFrame, is_training: bool = True) -> tuple[pd.DataFrame, list[str]]:
    """
    Engineer lag features, rolling windows, and cyclical temporal encodings
    grouped by household.
    """
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by=["household_id", "timestamp"]).reset_index(drop=True)

    # Cyclical hour features
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["sin_hour"] = np.sin(2 * np.pi * df["hour"] / 24.0)
    df["cos_hour"] = np.cos(2 * np.pi * df["hour"] / 24.0)

    # Grouped lag and rolling features per household
    df["lag_1h"] = df.groupby("household_id")["consumption_kw"].shift(1)
    df["lag_2h"] = df.groupby("household_id")["consumption_kw"].shift(2)
    df["lag_3h"] = df.groupby("household_id")["consumption_kw"].shift(3)

    # Rolling 3-hour mean & standard deviation (using closed='left' so we don't leak current step)
    df["rolling_mean_3h"] = df.groupby("household_id")["consumption_kw"].transform(
        lambda s: s.shift(1).rolling(window=3, min_periods=1).mean()
    )
    df["rolling_std_3h"] = df.groupby("household_id")["consumption_kw"].transform(
        lambda s: s.shift(1).rolling(window=3, min_periods=1).std().fillna(0.0)
    )

    if is_training:
        # Target: future consumption (1 hour ahead)
        df["target_consumption_kw"] = df.groupby("household_id")["consumption_kw"].shift(-1)
        # Drop rows with NaN in lags or target
        df = df.dropna(subset=FEATURE_COLUMNS + ["target_consumption_kw"]).reset_index(drop=True)
    else:
        # Fill any starting NaNs with current consumption
        for col in ["lag_1h", "lag_2h", "lag_3h", "rolling_mean_3h"]:
            df[col] = df[col].fillna(df["consumption_kw"])
        df["rolling_std_3h"] = df["rolling_std_3h"].fillna(0.0)

    return df, FEATURE_COLUMNS
