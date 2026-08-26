import React, { useState, useEffect } from 'react';
import {
  Tag,
  PlusCircle,
  IndianRupee,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { validateSellOrder } from '../../services/marketEngine';

export default function CompactSellCard({
  computedHouseholds = [],
  onCreateSellListing,
  disabled = false,
}) {
  const surplusHouseholds = computedHouseholds.filter((h) => h.availableSurplus > 0.001);
  const defaultSellerId = surplusHouseholds[0]?.id || computedHouseholds[0]?.id || 'house_a';

  const [sellerId, setSellerId] = useState(defaultSellerId);
  const [sellEnergy, setSellEnergy] = useState('2.0');
  const [sellPrice, setSellPrice] = useState('7.0');
  const [sellErrors, setSellErrors] = useState({});

  useEffect(() => {
    if (!computedHouseholds.find((h) => h.id === sellerId)) {
      setSellerId(defaultSellerId);
    }
  }, [computedHouseholds, defaultSellerId, sellerId]);

  const currentSeller = computedHouseholds.find((h) => h.id === sellerId) || computedHouseholds[0];
  const hasSurplus = (currentSeller?.availableSurplus || 0) > 0.001;
  const maxAvailable = currentSeller?.availableSurplus || 0;
  const calculatedTotal = (Number(sellEnergy) || 0) * (Number(sellPrice) || 0);

  const handleSelectSeller = (newId) => {
    setSellerId(newId);
    setSellErrors({});
    const newSeller = computedHouseholds.find((h) => h.id === newId);
    if (newSeller && newSeller.availableSurplus > 0.001) {
      setSellEnergy(String(Math.min(2.0, Math.round(newSeller.availableSurplus * 10) / 10)));
    } else {
      setSellEnergy('0.0');
    }
  };

  const handleSetMax = () => {
    if (maxAvailable > 0) {
      setSellEnergy(String(maxAvailable.toFixed(1)));
      setSellErrors({});
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasSurplus) {
      setSellErrors({ energy: `${currentSeller?.name} has 0.0 kWh surplus available.` });
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

  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-2.5 shadow-card space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <div className="flex items-center space-x-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-white shadow-2xs">
            <Tag className="h-3 w-3" />
          </div>
          <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-900">
            Sell Energy
          </span>
        </div>
        <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-200">
          Prosumer
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-1.5 text-xs">
        {/* Seller Selection */}
        <div>
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span className="font-bold text-slate-700">Seller</span>
            <span className={`font-mono font-extrabold ${hasSurplus ? 'text-emerald-700' : 'text-rose-600'}`}>
              Avail: +{maxAvailable.toFixed(1)} kWh
            </span>
          </div>
          <select
            value={sellerId}
            onChange={(e) => handleSelectSeller(e.target.value)}
            disabled={disabled}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {computedHouseholds.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} (+{h.availableSurplus?.toFixed(1) || 0} kWh)
              </option>
            ))}
          </select>
        </div>

        {/* Inputs Grid: Amount & Price */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <div className="flex items-center justify-between text-[9.5px] text-slate-600 mb-0.5">
              <span>Amount</span>
              {hasSurplus && (
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  Max
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={maxAvailable > 0 ? maxAvailable : undefined}
                value={sellEnergy}
                onChange={(e) => {
                  setSellEnergy(e.target.value);
                  setSellErrors({});
                }}
                disabled={disabled || !hasSurplus}
                placeholder="2.0"
                className={`w-full rounded-md border px-2 py-1 text-[11px] font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-1 ${
                  sellErrors.energy ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-emerald-500'
                } disabled:bg-slate-50`}
              />
              <span className="absolute right-2 top-1 text-[9px] font-mono text-slate-400 pointer-events-none">
                kWh
              </span>
            </div>
            {sellErrors.energy && (
              <p className="text-[8.5px] text-rose-500 font-semibold mt-0.5 leading-tight">{sellErrors.energy}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between text-[9.5px] text-slate-600 mb-0.5">
              <span>Price</span>
              <span className="font-mono text-[9px] text-slate-400">₹/kWh</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={sellPrice}
                onChange={(e) => {
                  setSellPrice(e.target.value);
                  setSellErrors({});
                }}
                disabled={disabled || !hasSurplus}
                placeholder="7.0"
                className={`w-full rounded-md border px-2 py-1 text-[11px] font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-1 ${
                  sellErrors.price ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-emerald-500'
                } disabled:bg-slate-50`}
              />
              <span className="absolute right-2 top-1 text-[9px] font-mono text-slate-400 pointer-events-none">
                ₹
              </span>
            </div>
            {sellErrors.price && (
              <p className="text-[8.5px] text-rose-500 font-semibold mt-0.5 leading-tight">{sellErrors.price}</p>
            )}
          </div>
        </div>

        {/* Total Price summary */}
        <div className="flex items-center justify-between rounded-lg bg-emerald-50/60 border border-emerald-200 px-2 py-1 text-xs">
          <span className="text-emerald-900 font-medium text-[10px]">Total Revenue:</span>
          <span className="font-mono font-extrabold text-emerald-800 text-xs">
            ₹{hasSurplus ? calculatedTotal.toFixed(2) : '0.00'}
          </span>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={disabled || !hasSurplus}
          className={`flex w-full items-center justify-center space-x-1.5 rounded-lg py-1.5 text-xs font-bold shadow-2xs transition active:scale-95 ${
            hasSurplus
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <PlusCircle className="h-3 w-3" />
          <span>{hasSurplus ? 'SELL' : 'NO SURPLUS (SELECT HOUSE A/C)'}</span>
        </button>
      </form>
    </div>
  );
}
