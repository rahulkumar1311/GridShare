"""
P2P Local Energy Marketplace Service.
Provides Continuous Double-Auction matching between prosumer sell offers and consumer buy requests.
Generates simulated EnergyTransaction records and OptimizationDecision audit trails.
Notice: All orders and transactions are strictly simulated. No real money, payment gateways or banking APIs are integrated.
"""

from datetime import datetime, timezone
from gridshare.backend.app.models import (
    db,
    MarketOffer,
    MarketRequest,
    EnergyTransaction,
    OptimizationDecision,
    Household,
)
from gridshare.backend.app.utils.logger import logger

class MarketplaceService:
    @classmethod
    def get_offers(cls, status=None, limit=50):
        query = MarketOffer.query
        if status:
            query = query.filter_by(status=status.upper())
        offers = query.order_by(MarketOffer.created_at.desc()).limit(limit).all()
        return [o.to_dict() for o in offers]

    @classmethod
    def create_offer(cls, household_id, energy_kwh, min_price_per_kwh=4.00):
        offer = MarketOffer(
            household_id=household_id,
            energy_kwh=round(float(energy_kwh), 3),
            min_price_per_kwh=round(float(min_price_per_kwh), 2),
            remaining_kwh=round(float(energy_kwh), 3),
            status="OPEN",
            source="SIMULATED",
        )
        db.session.add(offer)
        db.session.commit()
        logger.info(f"Created Sell Offer #{offer.id} for {household_id}: {energy_kwh} kWh @ min Rs {min_price_per_kwh}/kWh")
        return offer.to_dict()

    @classmethod
    def cancel_offer(cls, offer_id):
        offer = MarketOffer.query.get(offer_id)
        if not offer:
            return None
        offer.status = "CANCELLED"
        db.session.commit()
        return offer.to_dict()

    @classmethod
    def get_requests(cls, status=None, limit=50):
        query = MarketRequest.query
        if status:
            query = query.filter_by(status=status.upper())
        requests = query.order_by(MarketRequest.created_at.desc()).limit(limit).all()
        return [r.to_dict() for r in requests]

    @classmethod
    def create_request(cls, household_id, energy_kwh, max_price_per_kwh=5.00):
        req_obj = MarketRequest(
            household_id=household_id,
            energy_kwh=round(float(energy_kwh), 3),
            max_price_per_kwh=round(float(max_price_per_kwh), 2),
            remaining_kwh=round(float(energy_kwh), 3),
            status="OPEN",
            source="SIMULATED",
        )
        db.session.add(req_obj)
        db.session.commit()
        logger.info(f"Created Buy Request #{req_obj.id} for {household_id}: {energy_kwh} kWh @ max Rs {max_price_per_kwh}/kWh")
        return req_obj.to_dict()

    @classmethod
    def cancel_request(cls, request_id):
        req_obj = MarketRequest.query.get(request_id)
        if not req_obj:
            return None
        req_obj.status = "CANCELLED"
        db.session.commit()
        return req_obj.to_dict()

    @classmethod
    def auto_sync_orders_from_telemetry(cls):
        """
        Auto-generates open market offers from current prosumer surplus
        and open market requests from current consumer deficit.
        """
        from gridshare.backend.app.services.community_state_service import CommunityStateService
        state = CommunityStateService.observe_community_state()
        households = state.get("households", [])

        # Clear stale open auto-generated orders
        db.session.query(MarketOffer).filter_by(status="OPEN").delete()
        db.session.query(MarketRequest).filter_by(status="OPEN").delete()
        db.session.commit()

        for h in households:
            net = h.get("net_energy_kw", 0)
            hid = h.get("household_id")
            if net > 0.05: # Surplus prosumer -> Create Sell Offer
                cls.create_offer(household_id=hid, energy_kwh=net, min_price_per_kwh=4.00)
            elif net < -0.05: # Deficit consumer -> Create Buy Request
                cls.create_request(household_id=hid, energy_kwh=abs(net), max_price_per_kwh=5.00)

    @classmethod
    def match_orders(cls, auto_sync_if_empty=True):
        """
        Continuous Double-Auction Matching Algorithm.
        Considers:
        1. Local availability (seller offers sorted ASC by min_price_per_kwh)
        2. Buyer demand (buyer requests sorted DESC by max_price_per_kwh)
        3. Price compatibility (seller.min_price <= buyer.max_price)
        4. Transaction quantity (clears min(offer_qty, req_qty) at midpoint price)
        """
        now = datetime.now(timezone.utc)
        open_offers = MarketOffer.query.filter(MarketOffer.status.in_(["OPEN", "PARTIALLY_FILLED"])).order_by(MarketOffer.min_price_per_kwh.asc(), MarketOffer.created_at.asc()).all()
        open_requests = MarketRequest.query.filter(MarketRequest.status.in_(["OPEN", "PARTIALLY_FILLED"])).order_by(MarketRequest.max_price_per_kwh.desc(), MarketRequest.created_at.asc()).all()

        if auto_sync_if_empty and (not open_offers or not open_requests):
            cls.auto_sync_orders_from_telemetry()
            open_offers = MarketOffer.query.filter(MarketOffer.status.in_(["OPEN", "PARTIALLY_FILLED"])).order_by(MarketOffer.min_price_per_kwh.asc(), MarketOffer.created_at.asc()).all()
            open_requests = MarketRequest.query.filter(MarketRequest.status.in_(["OPEN", "PARTIALLY_FILLED"])).order_by(MarketRequest.max_price_per_kwh.desc(), MarketRequest.created_at.asc()).all()

        matched_transactions = []
        audit_decisions = []
        total_energy_cleared = 0.0

        off_idx = 0
        req_idx = 0

        while off_idx < len(open_offers) and req_idx < len(open_requests):
            offer = open_offers[off_idx]
            request = open_requests[req_idx]

            # Price Compatibility Check
            if offer.min_price_per_kwh > request.max_price_per_kwh:
                # No overlap between asking price and bid price
                break

            # Transaction Quantity (min of remaining)
            trade_qty = round(min(offer.remaining_kwh, request.remaining_kwh), 3)

            if trade_qty > 0.001:
                # Fair Midpoint Clearing Tariff
                clearing_price = round((offer.min_price_per_kwh + request.max_price_per_kwh) / 2.0, 2)
                total_value = round(trade_qty * clearing_price, 2)
                total_energy_cleared += trade_qty

                # Update Order Quantities and Statuses
                offer.remaining_kwh = round(offer.remaining_kwh - trade_qty, 3)
                offer.status = "FILLED" if offer.remaining_kwh <= 0.001 else "PARTIALLY_FILLED"

                request.remaining_kwh = round(request.remaining_kwh - trade_qty, 3)
                request.status = "FILLED" if request.remaining_kwh <= 0.001 else "PARTIALLY_FILLED"

                # Create EnergyTransaction
                tx = EnergyTransaction(
                    seller_household_id=offer.household_id,
                    buyer_household_id=request.household_id,
                    energy_kwh=trade_qty,
                    price_per_kwh=clearing_price,
                    total_value=total_value,
                    status="COMPLETED",
                    timestamp=now,
                )
                db.session.add(tx)
                matched_transactions.append(tx)

                # Create Audit Record in OptimizationDecisions
                dec = OptimizationDecision(
                    timestamp=now,
                    source_household=offer.household_id,
                    target=request.household_id,
                    energy_kwh=trade_qty,
                    action="LOCAL_TRADE",
                    reason=(
                        f"P2P Continuous Double Auction Matched: {offer.household_id} -> {request.household_id} "
                        f"for {trade_qty:.2f} kWh at uniform midpoint price Rs {clearing_price:.2f}/kWh "
                        f"(Total: Rs {total_value:.2f}). [SIMULATED TRANSACTION]"
                    ),
                )
                db.session.add(dec)
                audit_decisions.append(dec)

            if offer.remaining_kwh <= 0.001:
                off_idx += 1
            if request.remaining_kwh <= 0.001:
                req_idx += 1

        db.session.commit()

        return {
            "status": "SUCCESS",
            "matched_at": now.isoformat(),
            "transactions_count": len(matched_transactions),
            "total_energy_cleared_kwh": round(total_energy_cleared, 3),
            "transactions": [t.to_dict() for t in matched_transactions],
            "audit_records_count": len(audit_decisions),
            "source": "SIMULATED",
            "disclaimer": "Simulated local microgrid marketplace. No real payments, banking or external wallets are integrated.",
        }

    @classmethod
    def get_transactions(cls, limit=50):
        txs = EnergyTransaction.query.order_by(EnergyTransaction.timestamp.desc()).limit(limit).all()
        return [t.to_dict() for t in txs]
