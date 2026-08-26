from flask import Blueprint, jsonify, request
from gridshare.backend.app.services.marketplace_service import MarketplaceService

market_bp = Blueprint("market", __name__)

@market_bp.route("/api/market/offers", methods=["GET"])
def get_offers():
    """List open or active seller energy offers."""
    status = request.args.get("status")
    limit = int(request.args.get("limit", 50))
    offers = MarketplaceService.get_offers(status=status, limit=limit)
    return jsonify({
        "status": "SUCCESS",
        "count": len(offers),
        "offers": offers,
        "source": "SIMULATED",
    }), 200

@market_bp.route("/api/market/offers", methods=["POST"])
def post_offer():
    """Create a new seller energy offer."""
    data = request.get_json(silent=True) or {}
    household_id = data.get("household_id")
    energy_kwh = data.get("energy_kwh")
    min_price = data.get("min_price_per_kwh", 4.00)

    if not household_id or energy_kwh is None:
        return jsonify({"status": "ERROR", "message": "household_id and energy_kwh are required"}), 400

    offer = MarketplaceService.create_offer(household_id, energy_kwh, min_price)
    return jsonify({"status": "SUCCESS", "offer": offer}), 201

@market_bp.route("/api/market/offers/<int:offer_id>", methods=["DELETE"])
def delete_offer(offer_id):
    """Cancel an open seller offer."""
    res = MarketplaceService.cancel_offer(offer_id)
    if not res:
        return jsonify({"status": "ERROR", "message": "Offer not found"}), 404
    return jsonify({"status": "SUCCESS", "message": "Offer cancelled", "offer": res}), 200

@market_bp.route("/api/market/requests", methods=["GET"])
def get_requests():
    """List open or active buyer energy requests."""
    status = request.args.get("status")
    limit = int(request.args.get("limit", 50))
    reqs = MarketplaceService.get_requests(status=status, limit=limit)
    return jsonify({
        "status": "SUCCESS",
        "count": len(reqs),
        "requests": reqs,
        "source": "SIMULATED",
    }), 200

@market_bp.route("/api/market/requests", methods=["POST"])
def post_request():
    """Create a new buyer energy request."""
    data = request.get_json(silent=True) or {}
    household_id = data.get("household_id")
    energy_kwh = data.get("energy_kwh")
    max_price = data.get("max_price_per_kwh", 5.00)

    if not household_id or energy_kwh is None:
        return jsonify({"status": "ERROR", "message": "household_id and energy_kwh are required"}), 400

    req_obj = MarketplaceService.create_request(household_id, energy_kwh, max_price)
    return jsonify({"status": "SUCCESS", "request": req_obj}), 201

@market_bp.route("/api/market/requests/<int:req_id>", methods=["DELETE"])
def delete_request(req_id):
    """Cancel an open buyer request."""
    res = MarketplaceService.cancel_request(req_id)
    if not res:
        return jsonify({"status": "ERROR", "message": "Request not found"}), 404
    return jsonify({"status": "SUCCESS", "message": "Request cancelled", "request": res}), 200

@market_bp.route("/api/market/match", methods=["POST"])
def run_market_match():
    """
    Run continuous double-auction matching on open seller offers and buyer requests.
    Creates EnergyTransaction records and audit logs.
    """
    result = MarketplaceService.match_orders()
    return jsonify(result), 200

@market_bp.route("/api/market/transactions", methods=["GET"])
def get_market_transactions():
    """List all executed simulated P2P energy transactions."""
    limit = int(request.args.get("limit", 50))
    transactions = MarketplaceService.get_transactions(limit=limit)
    return jsonify({
        "status": "SUCCESS",
        "count": len(transactions),
        "transactions": transactions,
        "source": "SIMULATED",
        "disclaimer": "Simulated local microgrid marketplace. No real payments, banking or external wallets are integrated.",
    }), 200
