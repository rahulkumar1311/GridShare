# GridShare Machine Learning Engine

Provides Random Forest forecasting models for community microgrid load, solar generation, and surplus prediction.

## Model Architecture
- **Algorithm**: `RandomForestRegressor` with cyclical sine/cosine time transformations and feature engineering.
- **Inputs**: Timestamp (hour, day of week, cyclical encoding), household solar capacity, base load characteristics.
- **Targets**: `predicted_demand_kw`, `predicted_generation_kw`, `confidence`.

## Usage
```bash
# 1. Train model on 30-day synthetic diurnal dataset
python -m gridshare.ml.train_model

# 2. Run multi-step future inference
python -m gridshare.ml.predict
```
