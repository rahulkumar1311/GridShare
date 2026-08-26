"""
Community Battery Ownership & Fair Energy Accounting Service.
Tracks individual prosumer household contributions, round-trip efficiency losses (e.g. 90%),
and executes proportional ownership withdrawals to prevent unfair pool depletion.
Notice: All monetary metrics are simulated economic valuations for prototyping.
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from gridshare.backend.app.models import (
    db,
    Battery,
    BatteryContribution,
    BatteryWithdrawal,
    BatteryLedger,
    Household,
)
from gridshare.backend.app.utils.logger import logger

class BatteryAccountingService:
    DEFAULT_BATTERY_ID = "community_battery_1"
    DEFAULT_EFFICIENCY = 0.90
    DEFAULT_GRID_PRICE = 6.10

    @classmethod
    def get_or_create_battery(cls, battery_id=None):
        bid = battery_id or cls.DEFAULT_BATTERY_ID
        battery = db.session.get(Battery, bid)
        if not battery:
            battery = Battery(
                id=bid,
                community_id="green_enclave_cluster",
                capacity_kwh=50.0,
                current_energy_kwh=20.0,
                current_soc=40.0,
                round_trip_efficiency=cls.DEFAULT_EFFICIENCY,
                min_reserve=20.0,
                minimum_reserve_kwh=10.0,
            )
            db.session.add(battery)
            db.session.commit()
        return battery

    @classmethod
    def get_battery_state(cls, battery_id=None):
        battery = cls.get_or_create_battery(battery_id)
        contributions = BatteryContribution.query.filter_by(battery_id=battery.id).all()
        total_contributed = sum(c.contributed_energy_kwh for c in contributions)
        total_usable_credits = sum(c.remaining_credit_kwh for c in contributions)

        state = battery.to_dict()
        state.update({
            "total_historical_contributed_kwh": round(total_contributed, 4),
            "total_active_credits_kwh": round(total_usable_credits, 4),
            "active_contributors_count": len(set(c.household_id for c in contributions if c.remaining_credit_kwh > 0.0001)),
        })
        return state

    @classmethod
    def get_ownership_summary(cls, battery_id=None):
        """
        Returns household-level ownership credits, historical contribution,
        percentage share of active storage, and simulated valuation.
        """
        battery = cls.get_or_create_battery(battery_id)
        contributions = BatteryContribution.query.filter_by(battery_id=battery.id).all()

        # Group by household_id
        household_data = {}
        for c in contributions:
            hid = c.household_id
            if hid not in household_data:
                household_data[hid] = {
                    "household_id": hid,
                    "contributed_kwh": 0.0,
                    "usable_credit_kwh": 0.0,
                    "remaining_credit_kwh": 0.0,
                    "withdrawn_kwh": 0.0,
                }
            household_data[hid]["contributed_kwh"] += c.contributed_energy_kwh
            household_data[hid]["usable_credit_kwh"] += c.usable_energy_kwh
            household_data[hid]["remaining_credit_kwh"] += c.remaining_credit_kwh

        # Check withdrawals
        withdrawals = BatteryWithdrawal.query.filter_by(battery_id=battery.id).all()
        for w in withdrawals:
            hid = w.household_id
            if hid in household_data:
                household_data[hid]["withdrawn_kwh"] += w.allocated_energy_kwh

        total_active_credits = sum(h["remaining_credit_kwh"] for h in household_data.values())

        ownership_list = []
        for hid, data in household_data.items():
            rem = data["remaining_credit_kwh"]
            share_pct = round((rem / total_active_credits * 100.0), 2) if total_active_credits > 0 else 0.0
            est_value = round(rem * cls.DEFAULT_GRID_PRICE, 2)

            ownership_list.append({
                "household_id": hid,
                "contributed_kwh": round(data["contributed_kwh"], 4),
                "usable_credit_kwh": round(data["usable_credit_kwh"], 4),
                "remaining_credit_kwh": round(rem, 4),
                "withdrawn_kwh": round(data["withdrawn_kwh"], 4),
                "ownership_percent": share_pct,
                "estimated_value_inr": est_value,
                "status": "ACTIVE" if rem > 0.001 else "DEPLETED",
            })

        # Sort by remaining credit DESC
        ownership_list.sort(key=lambda x: x["remaining_credit_kwh"], reverse=True)
        return {
            "battery_id": battery.id,
            "total_active_credits_kwh": round(total_active_credits, 4),
            "efficiency_rate": battery.round_trip_efficiency,
            "ownership_shares": ownership_list,
        }

    @classmethod
    def contribute_energy(cls, household_id, energy_kwh, battery_id=None, reason=None):
        """
        Incorporate household surplus into the community battery:
        1. Validates positive non-zero energy.
        2. Applies round-trip efficiency (e.g. 10 kWh * 90% = 9.0 kWh usable).
        3. Updates battery SOC and creates BatteryContribution + BatteryLedger records.
        """
        if energy_kwh <= 0:
            raise ValueError("Contribution energy must be strictly greater than 0.0 kWh.")

        battery = cls.get_or_create_battery(battery_id)
        household = db.session.get(Household, household_id)
        if not household:
            raise ValueError(f"Household '{household_id}' does not exist in registry.")

        # Check capacity headroom
        current_energy = battery.current_energy_kwh if battery.current_energy_kwh is not None else 0.0
        headroom = battery.capacity_kwh - current_energy
        if energy_kwh > (headroom + 0.001):
            raise ValueError(f"Energy {energy_kwh} kWh exceeds available battery headroom {headroom:.2f} kWh.")

        now = datetime.now(timezone.utc)
        efficiency = battery.round_trip_efficiency or cls.DEFAULT_EFFICIENCY
        usable_kwh = round(energy_kwh * efficiency, 4)

        # Create contribution record
        contrib = BatteryContribution(
            battery_id=battery.id,
            household_id=household_id,
            contributed_energy_kwh=round(energy_kwh, 4),
            usable_energy_kwh=usable_kwh,
            remaining_credit_kwh=usable_kwh,
            contribution_timestamp=now,
            status="ACTIVE",
        )
        db.session.add(contrib)

        # Update battery state
        battery.current_energy_kwh = round(current_energy + energy_kwh, 4)
        battery.sync_soc_from_energy()
        battery.updated_at = now

        # Create Ledger Audit entry
        ledger_entry = BatteryLedger(
            battery_id=battery.id,
            household_id=household_id,
            action_type="CONTRIBUTION",
            energy_kwh=round(energy_kwh, 4),
            usable_kwh=usable_kwh,
            balance_after_kwh=battery.current_energy_kwh,
            soc_after_percent=battery.current_soc,
            economic_value_inr=round(usable_kwh * cls.DEFAULT_GRID_PRICE, 2),
            policy_applied="PROPORTIONAL_OWNERSHIP",
            reason=reason or f"{household_id} contributed {energy_kwh:.2f} kWh ({usable_kwh:.2f} kWh usable credit after {int(efficiency*100)}% efficiency).",
            timestamp=now,
        )
        db.session.add(ledger_entry)
        db.session.commit()

        logger.info(f"[Battery Contribution] {household_id} contributed {energy_kwh:.2f} kWh -> Stored {battery.current_energy_kwh:.2f} kWh ({battery.current_soc:.1f}% SOC)")

        return {
            "status": "SUCCESS",
            "contribution": contrib.to_dict(),
            "battery_state": battery.to_dict(),
        }

    @classmethod
    def calculate_proportional_allocation(cls, requested_kwh, battery_id=None, policy="PROPORTIONAL_OWNERSHIP"):
        """
        Calculates fair proportional allocation based on active household credit ownership:
        Formula: Allocated_i = Requested * (Credit_i / Total_Credits)
        """
        if requested_kwh <= 0:
            raise ValueError("Requested withdrawal energy must be strictly greater than 0.0 kWh.")

        battery = cls.get_or_create_battery(battery_id)
        current_energy = battery.current_energy_kwh if battery.current_energy_kwh is not None else 0.0
        reserve = battery.minimum_reserve_kwh if battery.minimum_reserve_kwh is not None else 10.0
        available_dispatch = max(0.0, current_energy - reserve)

        if available_dispatch <= 0.001:
            raise ValueError(f"Battery is at minimum reserve threshold ({reserve:.1f} kWh / {battery.min_reserve}% SOC). No energy available for dispatch.")

        # Query all active contributions
        active_contribs = BatteryContribution.query.filter(
            BatteryContribution.battery_id == battery.id,
            BatteryContribution.remaining_credit_kwh > 0.0001
        ).all()

        # Group by household
        household_credits = {}
        for c in active_contribs:
            hid = c.household_id
            household_credits[hid] = household_credits.get(hid, 0.0) + c.remaining_credit_kwh

        total_credits = sum(household_credits.values())
        if total_credits <= 0.0001:
            raise ValueError("No active household energy credits available in the community battery.")

        # Cap withdrawal to available dispatch and total credits
        actual_withdrawal = min(requested_kwh, available_dispatch, total_credits)

        allocations = []
        allocated_sum = 0.0

        for hid, credit in household_credits.items():
            share_ratio = credit / total_credits
            allocated_i = round(actual_withdrawal * share_ratio, 4)
            allocated_sum += allocated_i

            allocations.append({
                "household_id": hid,
                "initial_credit_kwh": round(credit, 4),
                "ownership_share_ratio": round(share_ratio, 4),
                "allocated_kwh": allocated_i,
                "remaining_credit_kwh": round(max(0.0, credit - allocated_i), 4),
            })

        # Correct rounding discrepancy on largest contributor
        rounding_diff = round(actual_withdrawal - allocated_sum, 4)
        if abs(rounding_diff) > 0.00001 and len(allocations) > 0:
            largest = max(allocations, key=lambda a: a["initial_credit_kwh"])
            largest["allocated_kwh"] = round(largest["allocated_kwh"] + rounding_diff, 4)
            largest["remaining_credit_kwh"] = round(max(0.0, largest["initial_credit_kwh"] - largest["allocated_kwh"]), 4)

        return {
            "requested_kwh": round(requested_kwh, 4),
            "actual_withdrawal_kwh": round(actual_withdrawal, 4),
            "total_available_credits_kwh": round(total_credits, 4),
            "battery_available_dispatch_kwh": round(available_dispatch, 4),
            "policy_applied": policy,
            "allocations": allocations,
        }

    @classmethod
    def withdraw_energy(cls, energy_kwh, battery_id=None, policy="PROPORTIONAL_OWNERSHIP", reason=None):
        """
        Executes an auditable proportional withdrawal across contributor accounts.
        Updates battery state, decrements contribution credits, and writes ledger entries.
        """
        calc_result = cls.calculate_proportional_allocation(energy_kwh, battery_id, policy)
        battery = cls.get_or_create_battery(battery_id)
        now = datetime.now(timezone.utc)

        actual_withdrawal = calc_result["actual_withdrawal_kwh"]
        allocations = calc_result["allocations"]

        # Deduct credits from individual contributions (FIFO order per household)
        withdrawal_records = []
        for alloc in allocations:
            hid = alloc["household_id"]
            to_deduct = alloc["allocated_kwh"]

            if to_deduct <= 0.0001:
                continue

            contribs = BatteryContribution.query.filter(
                BatteryContribution.battery_id == battery.id,
                BatteryContribution.household_id == hid,
                BatteryContribution.remaining_credit_kwh > 0.0001
            ).order_by(BatteryContribution.contribution_timestamp.asc()).all()

            rem_to_deduct = to_deduct
            for c in contribs:
                if rem_to_deduct <= 0:
                    break
                deduct_here = min(c.remaining_credit_kwh, rem_to_deduct)
                c.remaining_credit_kwh = round(c.remaining_credit_kwh - deduct_here, 4)
                if c.remaining_credit_kwh <= 0.0001:
                    c.status = "DEPLETED"
                else:
                    c.status = "PARTIALLY_WITHDRAWN"
                rem_to_deduct = round(rem_to_deduct - deduct_here, 4)

            # Create BatteryWithdrawal record
            w_rec = BatteryWithdrawal(
                battery_id=battery.id,
                household_id=hid,
                requested_energy_kwh=round(energy_kwh * alloc["ownership_share_ratio"], 4),
                allocated_energy_kwh=to_deduct,
                contribution_source=policy,
                timestamp=now,
            )
            db.session.add(w_rec)
            withdrawal_records.append(w_rec)

        # Update battery energy level
        battery.current_energy_kwh = round(max(0.0, (battery.current_energy_kwh or 0.0) - actual_withdrawal), 4)
        battery.sync_soc_from_energy()
        battery.updated_at = now

        # Create Ledger Audit Record
        ledger_entry = BatteryLedger(
            battery_id=battery.id,
            household_id=None,
            action_type="WITHDRAWAL",
            energy_kwh=actual_withdrawal,
            usable_kwh=actual_withdrawal,
            balance_after_kwh=battery.current_energy_kwh,
            soc_after_percent=battery.current_soc,
            economic_value_inr=round(actual_withdrawal * cls.DEFAULT_GRID_PRICE, 2),
            policy_applied=policy,
            reason=reason or f"Dispatched {actual_withdrawal:.2f} kWh to meet community demand under {policy} fairness policy.",
            timestamp=now,
        )
        db.session.add(ledger_entry)
        db.session.commit()

        logger.info(f"[Battery Withdrawal] Dispatched {actual_withdrawal:.2f} kWh -> Stored {battery.current_energy_kwh:.2f} kWh ({battery.current_soc:.1f}% SOC)")

        return {
            "status": "SUCCESS",
            "withdrawal_summary": calc_result,
            "withdrawals": [w.to_dict() for w in withdrawal_records],
            "battery_state": battery.to_dict(),
        }

    @classmethod
    def get_ledger(cls, battery_id=None, limit=100):
        battery = cls.get_or_create_battery(battery_id)
        entries = BatteryLedger.query.filter_by(battery_id=battery.id).order_by(BatteryLedger.timestamp.desc()).limit(limit).all()
        return [e.to_dict() for e in entries]
