import React, { useState, useEffect } from 'react';
import {
  Tag,
  ShoppingBag,
  PlusCircle,
  IndianRupee,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Layers,
  Sparkles,
  Trash2,
  Info
} from 'lucide-react';
import { validateSellOrder, validatePurchaseOrder } from '../../services/marketEngine';

export default function ManualOrderForms({
  computedHouseholds = [],
  sellOrders = [],
  onCreateSellListing,
  onInitiatePurchase,
  onCancelListing,
  activeBuyerId = 'house_b',
  onChangeActiveBuyer,
  disabled = false,
}) {
  // Prosumers that actually have positive surplus available
  const surplusHouseholds = computedHouseholds.filter((h) => h.availableSurplus > 0.05);
  const defaultSellerId = surplusHouseholds[0]?.id || computedHouseholds[0]?.id || 'house_a';

  // Sell Form state
  const [sellerId, setSellerId] = useState(defaultSellerId);
  const [sellEnergy, setSellEnergy] = useState('2.0');
  const [sellPrice, setSellPrice] = useState('7.0');
  const [sellErrors, setSellErrors] = useState({});

  // Ensure selected seller is valid and update sell energy if needed
  useEffect(() => {
    if (!computedHouseholds.find((h) => h.id === sellerId)) {
      setSellerId(defaultSellerId);
    }
  }, [computedHouseholds, defaultSellerId, sellerId]);

  const currentSeller = computedHouseholds.find((h) => h.id === sellerId) || computedHouseholds[0];
  const currentBuyer = computedHouseholds.find((h) => h.id === activeBuyerId) || computedHouseholds[1];

  const hasSurplusToSell = (currentSeller?.availableSurplus || 0) > 0.001;
  const maxAvailableSurplus = currentSeller?.availableSurplus || 0;

  const calculatedSellTotal = (Number(sellEnergy) || 0) * (Number(sellPrice) || 0);

  // Auto-adjust energy when switching seller
  const handleSelectSeller = (newId) => {
    setSellerId(newId);
    setSellErrors({});
    const newSeller = computedHouseholds.find((h) => h.id === newId);
    if (newSeller && newSeller.availableSurplus > 0.001) {
      const safeAmount = Math.min(2.0, Math.round(newSeller.availableSurplus * 10) / 10);
      setSellEnergy(String(safeAmount));
    } else {
      setSellEnergy('0.0');
    }
  };

  const handleSetMaxEnergy = () => {
    if (maxAvailableSurplus > 0) {
      setSellEnergy(String(maxAvailableSurplus.toFixed(1)));
      setSellErrors({});
    }
  };

  const handleSellSubmit = (e) => {
    e.preventDefault();
    if (!hasSurplusToSell) {
      setSellErrors({ energy: `${currentSeller?.name} has 0.0 kWh surplus available. Select a prosumer with surplus.` });
      return;
    }

    const payload = {
      household_id: sellerId,
      energy_kwh: Number(sellEnergy),
      min_price_per_kwh: Number(sellPrice),
    };
    const errors = validateSellOrder(payload, computedHouseholds);
    if (errors) {
      setSellErrors(errors);
      return;
    }
    setSellErrors({});
    onCreateSellListing(payload);
  };

  const openSellListings = sellOrders.filter((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED');

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-card space-y-3.5">
      {/* 1. SELLER: LIST SURPLUS ENERGY FORM */}
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3 space-y-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100">
          <div className="flex items-center space-x-1.5">
            <Tag className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
              1. Seller: List Energy in Marketplace
            </span>
          </div>
          <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-1.5 py-0.2 rounded">
            Public Listing
          </span>
        </div>

        <form onSubmit={handleSellSubmit} className="space-y-2 text-xs">
          <div>
            <label className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-0.5">
              <span>Prosumer Seller</span>
              {currentSeller && (
                <span className={`font-mono font-bold ${hasSurplusToSell ? 'text-emerald-700' : 'text-rose-600'}`}>
                  Surplus Avail: +{currentSeller.availableSurplus?.toFixed(1) || 0} kWh
                </span>
              )}
            </label>
            <select
              value={sellerId}
              onChange={(e) => handleSelectSeller(e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1.5 focus:ring-emerald-500"
            >
              <optgroup label="Prosumers with Available Surplus (Can Sell)">
                {computedHouseholds
                  .filter((h) => h.availableSurplus > 0.001)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.type}) — Surplus: +{h.availableSurplus.toFixed(1)} kWh | Wallet: ₹{h.wallet.toFixed(0)}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Consumers in Deficit / No Surplus">
                {computedHouseholds
                  .filter((h) => h.availableSurplus <= 0.001)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.type}) — Deficit: -{h.remainingDeficit.toFixed(1)} kWh (Surplus: 0.0 kWh)
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Warning banner when seller has 0 surplus */}
          {!hasSurplusToSell && (
            <div className="flex items-start space-x-1.5 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[10.5px] text-amber-900">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>{currentSeller?.name}</strong> has 0.0 kWh surplus (Net: {currentSeller?.netEnergy.toFixed(1)} kW).
                Please select <strong>House A (+4.7 kWh)</strong> or <strong>House C (+1.0 kWh)</strong> above to list energy.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between text-[9.5px] font-medium text-slate-600 mb-0.5">
                <span>Energy Amount</span>
                {hasSurplusToSell && (
                  <button
                    type="button"
                    onClick={handleSetMaxEnergy}
                    className="text-[9px] font-bold text-emerald-700 hover:underline"
                  >
                    Max: {maxAvailableSurplus.toFixed(1)} kWh
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={maxAvailableSurplus > 0 ? maxAvailableSurplus : undefined}
                value={sellEnergy}
                onChange={(e) => {
                  setSellEnergy(e.target.value);
                  setSellErrors({});
                }}
                disabled={disabled || !hasSurplusToSell}
                placeholder="2.0"
                className={`w-full rounded-lg border px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-1.5 ${
                  sellErrors.energy ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-emerald-500'
                } disabled:bg-slate-100 disabled:text-slate-400`}
              />
              {sellErrors.energy && (
                <p className="text-[9px] text-rose-500 font-semibold mt-0.5">{sellErrors.energy}</p>
              )}
            </div>

            <div>
              <label className="flex items-center justify-between text-[9.5px] font-medium text-slate-600 mb-0.5">
                <span>Unit Price</span>
                <span className="font-mono text-slate-400">₹/kWh</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={sellPrice}
                onChange={(e) => {
                  setSellPrice(e.target.value);
                  setSellErrors({});
                }}
                disabled={disabled || !hasSurplusToSell}
                placeholder="7.0"
                className={`w-full rounded-lg border px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-1.5 ${
                  sellErrors.price ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-emerald-500'
                } disabled:bg-slate-100 disabled:text-slate-400`}
              />
              {sellErrors.price && (
                <p className="text-[9px] text-rose-500 font-semibold mt-0.5">{sellErrors.price}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-white border border-emerald-200 px-2.5 py-1 text-xs">
            <span className="text-emerald-900 font-medium text-[10.5px]">Listing Total Value:</span>
            <span className="font-mono font-extrabold text-emerald-800">
              ₹{hasSurplusToSell ? calculatedSellTotal.toFixed(2) : '0.00'}
            </span>
          </div>

          <button
            type="submit"
            disabled={disabled || !hasSurplusToSell}
            className={`flex w-full items-center justify-center space-x-1.5 rounded-xl py-1.5 text-xs font-bold shadow-xs transition active:scale-95 ${
              hasSurplusToSell
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>{hasSurplusToSell ? 'LIST ENERGY FOR SALE' : 'NO SURPLUS TO SELL (SELECT HOUSE A / C)'}</span>
          </button>
        </form>
      </div>

      {/* 2. BUYER: AVAILABLE ENERGY MARKETPLACE (Browse & Purchase) */}
      <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-3 space-y-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
          <div className="flex items-center space-x-1.5">
            <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
              2. Available Energy Marketplace
            </span>
          </div>
          <span className="text-[9.5px] font-bold text-blue-800 bg-blue-100/80 border border-blue-200 px-1.5 py-0.2 rounded">
            {openSellListings.length} Available
          </span>
        </div>

        {/* Buyer Persona Selector */}
        <div className="rounded-lg bg-white border border-blue-200 p-2 text-xs">
          <label className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
            <span className="flex items-center space-x-1">
              <UserCheck className="h-3 w-3 text-blue-600" />
              <span>Browsing as Buyer:</span>
            </span>
            {currentBuyer && (
              <span className="font-mono text-blue-800 font-extrabold">
                Wallet: ₹{currentBuyer.wallet.toFixed(2)}
              </span>
            )}
          </label>
          <select
            value={activeBuyerId}
            onChange={(e) => onChangeActiveBuyer(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1.5 focus:ring-blue-500"
          >
            {computedHouseholds.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.type}) — Deficit: -{h.remainingDeficit?.toFixed(1) || 0} kWh | Wallet: ₹{h.wallet.toFixed(0)}
              </option>
            ))}
          </select>
        </div>

        {/* Active Energy Listings Cards */}
        {openSellListings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-500">No energy listings currently available.</p>
            <p className="text-[10px]">Use the form above (with House A or House C) to list surplus solar energy for sale.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {openSellListings.map((order) => {
              const isOwnOrder = order.household_id === activeBuyerId;
              const totalCost = order.remaining_kwh * order.min_price_per_kwh;
              const hasSufficientFunds = (currentBuyer?.wallet || 0) >= totalCost;

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs hover:border-blue-300 transition space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-slate-500 text-[10.5px]">{order.id}</span>
                        <span className="font-extrabold text-slate-900">{order.household_id?.toUpperCase()}</span>
                        <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[8.5px] font-bold text-emerald-800">
                          SELLER
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono text-[11px] mt-0.5">
                        <span className="font-bold text-emerald-700">{order.remaining_kwh.toFixed(1)} kWh</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-slate-900">₹{order.min_price_per_kwh.toFixed(2)}/kWh</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-emerald-800">Total: ₹{totalCost.toFixed(2)}</span>
                      </div>
                    </div>

                    {order.household_id === activeBuyerId ? (
                      <button
                        onClick={() => onCancelListing(order.id)}
                        disabled={disabled}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Cancel your listing"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {/* PURCHASE BUTTON */}
                  {isOwnOrder ? (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-1.5 text-center text-[10px] text-slate-500 font-semibold">
                      Your own listing (Switch buyer persona above to purchase)
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        onInitiatePurchase({
                          buyerId: activeBuyerId,
                          sellOrder: order,
                          quantityKwh: order.remaining_kwh,
                        })
                      }
                      disabled={disabled || !hasSufficientFunds}
                      className={`flex w-full items-center justify-center space-x-1.5 rounded-xl py-1.5 text-xs font-bold shadow-xs transition active:scale-95 ${
                        hasSufficientFunds
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>
                        {hasSufficientFunds
                          ? `PURCHASE ${order.remaining_kwh.toFixed(1)} kWh (₹${totalCost.toFixed(2)})`
                          : `Insufficient Funds (Needs ₹${totalCost.toFixed(2)})`}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
