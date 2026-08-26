import os
import json
from datetime import datetime, timezone
from gridshare.backend.app.models import db, Prediction, Household, EnergyReading
from gridshare.ml.predict import DemandPredictor

class PredictionService:
    _predictor = None

    @classmethod
    def get_predictor(cls):
        if cls._predictor is None:
            cls._predictor = DemandPredictor()
        return cls._predictor

    @staticmethod
    def get_predictions(household_id=None, limit=50):
        query = Prediction.query
        if household_id:
            query = query.filter_by(household_id=household_id)
        preds = query.order_by(Prediction.prediction_time.asc()).limit(limit).all()
        return [p.to_dict() for p in preds]

    @classmethod
    def run_prediction_pipeline(cls):
        """
        1. Load latest community data.
        2. Generate prediction features.
        3. Run trained RandomForestRegressor.
        4. Store predictions in PostgreSQL/SQLite.
        5. Return structured predicted demand.
        """
        predictor = cls.get_predictor()
        households = Household.query.all()
        persisted_records = []
        forecasts_by_household = []

        # Read model metadata
        meta_path = os.path.join(os.path.dirname(__file__), "../../../ml/model/metadata.json")
        metrics = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    meta = json.load(f)
                    metrics = meta.get("metrics", {})
            except Exception:
                pass

        for h in households:
            # 1. Load latest community data and recent historical readings
            recent_readings = (
                EnergyReading.query.filter_by(household_id=h.id)
                .order_by(EnergyReading.timestamp.desc())
                .limit(5)
                .all()
            )
            recent_dicts = [r.to_dict() for r in reversed(recent_readings)]
            current_reading = recent_readings[0] if len(recent_readings) > 0 else None

            # 2 & 3. Generate features and run model
            forecasts = predictor.predict_next_hours(
                household_id=h.id,
                recent_readings=recent_dicts,
                horizon_hours=6
            )

            # 4. Store predictions in DB
            for fc in forecasts:
                ts = datetime.fromisoformat(fc["prediction_time"].replace("Z", "+00:00"))
                pred_obj = Prediction(
                    household_id=h.id,
                    prediction_time=ts,
                    predicted_demand_kw=fc["predicted_demand_kw"],
                    predicted_generation_kw=fc["predicted_generation_kw"],
                    confidence=None,  # Do not invent confidence percentages
                    uncertainty_value=fc.get("uncertainty_value"),
                    model_version="random_forest_v1.0",
                )
                db.session.add(pred_obj)
                persisted_records.append(pred_obj)

            # Format 1-hour ahead predicted demand
            next_1h = forecasts[0] if forecasts else {}
            forecasts_by_household.append({
                "household_id": h.id,
                "household_name": h.name,
                "household_type": h.household_type,
                "current_demand_kw": current_reading.consumption_kw if current_reading else 0.0,
                "predicted_demand_kw": next_1h.get("predicted_demand_kw", 0.0),
                "predicted_generation_kw": next_1h.get("predicted_generation_kw", 0.0),
                "predicted_net_balance_kw": next_1h.get("predicted_net_balance_kw", 0.0),
                "prediction_horizon": "1 hour ahead",
                "prediction_time": next_1h.get("prediction_time"),
                "confidence": None,
                "uncertainty_metric": "ensemble_tree_std_kw",
                "uncertainty_value": next_1h.get("uncertainty_value"),
                "model_version": "random_forest_v1.0",
                "multi_step_forecast": forecasts,
            })

        db.session.commit()

        return {
            "status": "SUCCESS",
            "message": f"Generated and persisted {len(persisted_records)} ML predictions across {len(households)} households",
            "model_version": "random_forest_v1.0",
            "model_type": "RandomForestRegressor (Baseline)",
            "evaluation_metrics": metrics,
            "predictions_count": len(persisted_records),
            "latest_predictions": forecasts_by_household,
        }

    @classmethod
    def get_latest_predictions(cls):
        """
        Retrieve structured latest prediction comparison for all households.
        """
        households = Household.query.all()
        results = []

        for h in households:
            latest_reading = (
                EnergyReading.query.filter_by(household_id=h.id)
                .order_by(EnergyReading.timestamp.desc())
                .first()
            )
            
            # Fetch latest future prediction
            now = datetime.now(timezone.utc)
            latest_pred = (
                Prediction.query.filter_by(household_id=h.id)
                .filter(Prediction.prediction_time >= now)
                .order_by(Prediction.prediction_time.asc())
                .first()
            )

            # If no future prediction exists, get the most recent prediction recorded
            if not latest_pred:
                latest_pred = (
                    Prediction.query.filter_by(household_id=h.id)
                    .order_by(Prediction.prediction_time.desc())
                    .first()
                )

            current_demand = latest_reading.consumption_kw if latest_reading else 0.0
            pred_demand = latest_pred.predicted_demand_kw if latest_pred else current_demand
            pred_gen = latest_pred.predicted_generation_kw if latest_pred else 0.0
            confidence_val = latest_pred.confidence if (latest_pred and latest_pred.confidence is not None) else None
            uncertainty_val = latest_pred.uncertainty_value if latest_pred else None

            results.append({
                "household": {
                    "id": h.id,
                    "name": h.name,
                    "location": h.location,
                    "household_type": h.household_type,
                },
                "current_demand_kw": round(current_demand, 3),
                "predicted_demand_kw": round(pred_demand, 3),
                "predicted_generation_kw": round(pred_gen, 3),
                "predicted_net_balance_kw": round(pred_gen - pred_demand, 3),
                "prediction_horizon": "1 hour ahead",
                "prediction_time": latest_pred.prediction_time.isoformat() if (latest_pred and latest_pred.prediction_time) else None,
                "model_version": latest_pred.model_version if latest_pred else "random_forest_v1.0",
                "confidence": confidence_val,
                "uncertainty_metric": "ensemble_tree_std_kw",
                "uncertainty_value": uncertainty_val,
            })

        return {
            "status": "SUCCESS",
            "count": len(results),
            "data": results,
            "uncertainty_note": "Statistically sound tree ensemble standard deviation is provided. No arbitrary confidence percentages are fabricated.",
        }
