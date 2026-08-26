from flask import Blueprint, jsonify
from gridshare.backend.app.services.dashboard_service import DashboardService

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/api/dashboard/summary", methods=["GET"])
def get_dashboard_summary():
    """Retrieve consolidated metrics for the React frontend."""
    summary = DashboardService.get_dashboard_summary()
    return jsonify({"status": "SUCCESS", "data": summary}), 200
