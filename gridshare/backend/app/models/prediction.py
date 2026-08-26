from datetime import datetime, timezone
from . import db

class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    household_id = db.Column(db.String(50), db.ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_time = db.Column(db.DateTime, nullable=False, index=True) # Future forecasted time
    predicted_demand_kw = db.Column(db.Float, nullable=False)
    predicted_generation_kw = db.Column(db.Float, nullable=False, default=0.0)
    confidence = db.Column(db.Float, nullable=True) # Statistically valid confidence or None
    uncertainty_value = db.Column(db.Float, nullable=True) # Ensemble tree spread in kW
    model_version = db.Column(db.String(50), nullable=False, default="random_forest_v1.0")

    def to_dict(self):
        return {
            "id": self.id,
            "household_id": self.household_id,
            "prediction_time": self.prediction_time.isoformat() if self.prediction_time else None,
            "predicted_demand_kw": round(self.predicted_demand_kw, 3),
            "predicted_generation_kw": round(self.predicted_generation_kw, 3),
            "predicted_net_balance_kw": round(self.predicted_generation_kw - self.predicted_demand_kw, 3),
            "confidence": round(self.confidence, 3) if self.confidence is not None else None,
            "uncertainty_value": round(self.uncertainty_value, 4) if self.uncertainty_value is not None else None,
            "uncertainty_metric": "ensemble_tree_std_kw" if self.uncertainty_value is not None else None,
            "model_version": self.model_version,
        }
