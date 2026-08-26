from flask import Blueprint, jsonify, request
from gridshare.backend.app.services.prediction_service import PredictionService

prediction_bp = Blueprint("predictions", __name__)

@prediction_bp.route("/api/predictions/run", methods=["POST"])
def run_predictions():
    """
    Trigger the ML demand prediction pipeline:
    1. Load latest community data
    2. Generate prediction features
    3. Run the trained model
    4. Store predictions in DB
    5. Return predicted demand
    """
    result = PredictionService.run_prediction_pipeline()
    return jsonify(result), 200

@prediction_bp.route("/api/predictions/latest", methods=["GET"])
def get_latest_predictions():
    """
    Retrieve structured latest predictions comparing current demand with predicted demand,
    including model version, prediction horizon, and ensemble uncertainty metrics.
    """
    result = PredictionService.get_latest_predictions()
    return jsonify(result), 200

@prediction_bp.route("/api/predictions", methods=["GET"])
def get_predictions():
    """Retrieve raw prediction records from the database."""
    household_id = request.args.get("household_id")
    limit = int(request.args.get("limit", 50))
    predictions = PredictionService.get_predictions(household_id=household_id, limit=limit)
    return jsonify({"status": "SUCCESS", "count": len(predictions), "predictions": predictions}), 200
