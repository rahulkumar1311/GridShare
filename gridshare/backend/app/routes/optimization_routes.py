from flask import Blueprint, jsonify, request
from gridshare.backend.app.services.optimization_service import OptimizationService

optimization_bp = Blueprint("optimization", __name__)

@optimization_bp.route("/api/optimization/run", methods=["POST"])
def run_optimization():
    """Trigger the GridShare Rule & Optimization Engine."""
    result = OptimizationService.run_optimization_engine()
    return jsonify(result), 200

@optimization_bp.route("/api/optimization/latest", methods=["GET"])
def get_latest_decisions():
    """Retrieve recent optimization routing decisions."""
    limit = int(request.args.get("limit", 20))
    decisions = OptimizationService.get_latest_decisions(limit=limit)
    return jsonify({"status": "SUCCESS", "count": len(decisions), "decisions": decisions}), 200
