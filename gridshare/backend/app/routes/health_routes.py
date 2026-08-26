from flask import Blueprint, jsonify
from gridshare.backend.app.models import db
from gridshare.backend.app.utils.logger import logger

health_bp = Blueprint("health", __name__)

@health_bp.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint verifying database connectivity and service state."""
    db_status = "healthy"
    try:
        # Simple DB ping
        db.session.execute(db.text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        db_status = f"unhealthy ({str(e)})"

    return jsonify({
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "GridShare Backend API",
        "database": db_status,
        "mode": "Simulation / IoT Smart Grid",
        "version": "1.0.0",
    }), 200 if db_status == "healthy" else 503
