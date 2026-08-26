from flask import Blueprint, jsonify
from gridshare.backend.app.models import Household

household_bp = Blueprint("households", __name__)

@household_bp.route("/api/households", methods=["GET"])
def get_households():
    """List all registered community households."""
    households = Household.query.all()
    return jsonify({
        "status": "SUCCESS",
        "count": len(households),
        "households": [h.to_dict() for h in households],
    }), 200

@household_bp.route("/api/households/<string:household_id>", methods=["GET"])
def get_household_detail(household_id):
    """Get single household details."""
    from gridshare.backend.app.models import db
    household = db.session.get(Household, household_id)
    if not household:
        return jsonify({"status": "ERROR", "message": f"Household '{household_id}' not found"}), 404
    return jsonify({"status": "SUCCESS", "household": household.to_dict()}), 200

