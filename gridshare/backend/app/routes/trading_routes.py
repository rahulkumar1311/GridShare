from flask import Blueprint, jsonify, request
from gridshare.backend.app.services.trading_service import TradingService

trading_bp = Blueprint("trading", __name__)

@trading_bp.route("/api/trades", methods=["GET"])
def get_trades():
    """Retrieve peer-to-peer energy transactions."""
    limit = int(request.args.get("limit", 50))
    trades = TradingService.get_trades(limit=limit)
    return jsonify({"status": "SUCCESS", "count": len(trades), "trades": trades}), 200

@trading_bp.route("/api/trades/match", methods=["POST"])
def match_trades():
    """Trigger automated P2P trade matching across nodes."""
    result = TradingService.match_orders()
    return jsonify(result), 200
