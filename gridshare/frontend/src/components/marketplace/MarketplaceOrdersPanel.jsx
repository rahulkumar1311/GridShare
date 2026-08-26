import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  UserCheck,
  Trash2,
  Zap,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  AlertTriangle
} from 'lucide-react';

export default function MarketplaceOrdersPanel({
  computedHouseholds = [],
  sellOrders = [],
  onInitiatePurchase,
  onCancelListing,
  activeBuyerId = 'house_b',
  onChangeActiveBuyer,
  disabled = false,
}) {
  const [filterQty, setFilterQty] = useState('ALL'); // 'ALL', 'LT1', '1TO5', 'GT5'
  const [filterSeller, setFilterSeller] = useState('ALL'); // 'ALL', 'house_a', 'house_c'
  const [sortBy, setSortBy] = useState('PRICE_ASC'); // 'PRICE_ASC', 'ENERGY_DESC', 'NEWEST'
  const [partialQtyMap, setPartialQtyMap] = useState({});

  const currentBuyer = computedHouseholds.find((h) => h.id === activeBuyerId) || computedHouseholds[1];

  // Filter & Sort Orders
  const filteredOrders = useMemo(() => {
    let list = (sellOrders || []).filter(
      (o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED' || o.status === 'AVAILABLE'
    );

    // Quantity Filter
    if (filterQty === 'LT1') {
      list = list.filter((o) => o.remaining_kwh < 1.0);
    } else if (filterQty === '1TO5') {
      list = list.filter((o) => o.remaining_kwh >= 1.0 && o.remaining_kwh <= 5.0);
    } else if (filterQty === 'GT5') {
      list = list.filter((o) => o.remaining_kwh > 5.0);
    }

    // Seller Filter
    if (filterSeller !== 'ALL') {
      list = list.filter((o) => o.household_id === filterSeller);
    }

    // Sorting
    if (sortBy === 'PRICE_ASC') {
      list.sort((a, b) => a.min_price_per_kwh - b.min_price_per_kwh);
    } else if (sortBy === 'ENERGY_DESC') {
      list.sort((a, b) => b.remaining_kwh - a.remaining_kwh);
    } else if (sortBy === 'NEWEST') {
      list.sort((a, b) => (b.id > a.id ? 1 : -1));
    }

    return list;
  }, [sellOrders, filterQty, filterSeller, sortBy]);

  const handleSetPartial = (orderId, val) => {
    setPartialQtyMap((prev) => ({ ...prev, [orderId]: val }));
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-3 shadow-card space-y-2.5 select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <div className="flex items-center space-x-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-white shadow-2xs">
            <ShoppingBag className="h-3 w-3" />
          </div>
          <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-900">
            Available Orders
          </span>
        </div>
        <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-800 border border-blue-200">
          {filteredOrders.length} Listings
        </span>
      </div>

      {/* Buyer Persona Selector */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
          <span className="flex items-center space-x-1">
            <UserCheck className="h-3 w-3 text-blue-600" />
            <span>Buyer Persona:</span>
          </span>
          {currentBuyer && (
            <span className="font-mono text-blue-800 font-extrabold text-xs">
              Wallet: ₹{currentBuyer.wallet?.toFixed(0) || 0}
            </span>
          )}
        </div>
        <select
          value={activeBuyerId}
          onChange={(e) => onChangeActiveBuyer(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {computedHouseholds.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} (Wallet: ₹{h.wallet?.toFixed(0) || 0} | Deficit: {h.consumption > h.generation ? `-${(h.consumption - h.generation).toFixed(1)} kW` : '0 kW'})
            </option>
          ))}
        </select>
      </div>

      {/* Filter & Sort Controls */}
      <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
        <div>
          <span className="text-slate-500 font-semibold block mb-0.5">Filter Qty:</span>
          <select
            value={filterQty}
            onChange={(e) => setFilterQty(e.target.value)}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.8 font-bold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Volumes</option>
            <option value="LT1">&lt; 1.0 kWh</option>
            <option value="1TO5">1.0 – 5.0 kWh</option>
            <option value="GT5">&gt; 5.0 kWh</option>
          </select>
        </div>

        <div>
          <span className="text-slate-500 font-semibold block mb-0.5">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.8 font-bold text-slate-700 focus:outline-none"
          >
            <option value="PRICE_ASC">Lowest Price</option>
            <option value="ENERGY_DESC">Highest Energy</option>
            <option value="NEWEST">Newest First</option>
          </select>
        </div>
      </div>

      {/* Listings Scroll Area */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
        {filteredOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4 text-center text-xs text-slate-400">
            <p className="font-semibold text-slate-600 text-[11px]">No active energy listings.</p>
            <p className="text-[9.5px] mt-0.5">List surplus energy using the Sell card on the left.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isOwn = order.household_id === activeBuyerId;
            const maxAvailable = order.remaining_kwh || order.energy_kwh;
            const chosenQty = Number(partialQtyMap[order.id]) || maxAvailable;
            const clampedQty = Math.min(maxAvailable, Math.max(0.1, chosenQty));
            const totalCost = Math.round(clampedQty * order.min_price_per_kwh * 100) / 100;
            const hasFunds = (currentBuyer?.wallet || 0) >= totalCost;

            return (
              <div
                key={order.id}
                className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs hover:border-blue-300 transition space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="font-extrabold text-slate-900 text-[11px]">{order.household_id?.toUpperCase()}</span>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[8px] font-bold text-emerald-800 border border-emerald-200 uppercase">
                        AVAILABLE
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono text-[10.5px] text-slate-600 mt-0.5">
                      <span className="font-bold text-emerald-700">{maxAvailable.toFixed(1)} kWh</span>
                      <span>•</span>
                      <span className="font-bold text-slate-900">₹{order.min_price_per_kwh.toFixed(2)}/kWh</span>
                      <span>•</span>
                      <span className="font-bold text-emerald-900">Total: ₹{(maxAvailable * order.min_price_per_kwh).toFixed(2)}</span>
                    </div>
                  </div>

                  {isOwn && (
                    <button
                      onClick={() => onCancelListing(order.id)}
                      disabled={disabled}
                      className="text-slate-400 hover:text-rose-600 p-1 text-[10px] font-bold flex items-center space-x-0.5 border border-slate-200 rounded px-1.5 py-0.5"
                      title="Cancel listing"
                    >
                      <Trash2 className="h-3 w-3 text-rose-500" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>

                {/* Partial Purchase Slider & Amount */}
                {!isOwn && (
                  <div className="rounded bg-slate-50 border border-slate-100 p-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-semibold">Purchase Amount:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {clampedQty.toFixed(1)} / {maxAvailable.toFixed(1)} kWh
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max={maxAvailable}
                      step="0.1"
                      value={clampedQty}
                      onChange={(e) => handleSetPartial(order.id, Number(e.target.value))}
                      disabled={disabled}
                      className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                    />
                  </div>
                )}

                {/* Action button */}
                {isOwn ? (
                  <div className="rounded bg-slate-50 border border-slate-200 py-1 text-center text-[9.5px] text-slate-500 font-semibold">
                    Your own active listing
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      onInitiatePurchase({
                        buyerId: activeBuyerId,
                        sellOrder: order,
                        quantityKwh: clampedQty,
                      })
                    }
                    disabled={disabled || !hasFunds}
                    className={`flex w-full items-center justify-center space-x-1.5 rounded-lg py-1.5 text-[11px] font-bold shadow-2xs transition active:scale-95 ${
                      hasFunds
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>
                      {hasFunds
                        ? `PURCHASE ${clampedQty.toFixed(1)} kWh (₹${totalCost.toFixed(2)})`
                        : `INSUFFICIENT BALANCE (Need ₹${totalCost.toFixed(2)})`}
                    </span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
