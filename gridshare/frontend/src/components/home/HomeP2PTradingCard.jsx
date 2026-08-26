import React, { useState } from 'react';
import {
  ShoppingBag,
  Zap,
  IndianRupee,
  Radio,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Tag,
  Sparkles,
  Gauge
} from 'lucide-react';

export default function HomeP2PTradingCard({
  surplusKw = 2.2,
  deficitKw = 0,
  isSurplus = true,
  selectedHouseholdId = 'house_a',
  onListP2PSell,
  onBuyP2PEnergy,
  onExportToGrid,
  onImportFromGrid,
  gridTariff = 6.10,
  p2pTariff = 4.50,
}) {
  // Sell Form state
  const [sellAmount, setSellAmount] = useState('1.0');
  const [sellPrice, setSellPrice] = useState('4.50');
  const [sellStatus, setSellStatus] = useState('');
  const [sellError, setSellError] = useState('');

  // Buy Form state
  const [buyAmount, setBuyAmount] = useState('1.0');
  const [buyStatus, setBuyStatus] = useState('');
  const [buyError, setBuyError] = useState('');

  const handleSellP2P = async (e) => {
    e.preventDefault();
    setSellError('');
    setSellStatus('');

    const amt = parseFloat(sellAmount);
    const price = parseFloat(sellPrice);

    if (isNaN(amt) || amt <= 0) {
      setSellError('Enter a valid surplus energy volume (kWh).');
      return;
    }

    if (amt > surplusKw + 0.05) {
      setSellError(`Cannot list ${amt.toFixed(1)} kWh. Available surplus is only ${surplusKw.toFixed(1)} kWh.`);
      return;
    }

    try {
      await onListP2PSell({
        householdId: selectedHouseholdId,
        energyKwh: amt,
        pricePerKwh: price,
      });
      setSellStatus(`Listed ${amt.toFixed(1)} kWh @ ₹${price.toFixed(2)}/kWh on P2P Marketplace!`);
      setTimeout(() => setSellStatus(''), 4000);
    } catch (err) {
      setSellError(err.message || 'Failed to list energy.');
    }
  };

  const handleBuyP2P = async (e) => {
    e.preventDefault();
    setBuyError('');
    setBuyStatus('');

    const amt = parseFloat(buyAmount);
    if (isNaN(amt) || amt <= 0) {
      setBuyError('Enter a valid energy volume to purchase.');
      return;
    }

    try {
      await onBuyP2PEnergy({
        householdId: selectedHouseholdId,
        energyKwh: amt,
        pricePerKwh: p2pTariff,
      });
      setBuyStatus(`Purchased ${amt.toFixed(1)} kWh of green P2P energy @ ₹${p2pTariff.toFixed(2)}/kWh!`);
      setTimeout(() => setBuyStatus(''), 4000);
    } catch (err) {
      setBuyError(err.message || 'Failed to complete P2P purchase.');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card space-y-4">
      {/* Smart Meter HUD */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-slate-50 to-emerald-50/40 p-3.5 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-blue-100 mb-2.5">
          <div className="flex items-center space-x-2">
            <Gauge className="h-4 w-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Smart Bi-Directional Meter
            </h4>
          </div>
          <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            ID: #{selectedHouseholdId.toUpperCase()} • 230V 50Hz
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">Active Power</span>
            <span className={`font-mono text-sm font-bold ${isSurplus ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isSurplus ? `+${surplusKw.toFixed(2)}` : `-${deficitKw.toFixed(2)}`} kW
            </span>
          </div>

          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">Power Flow</span>
            <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded block mt-0.5 ${
              isSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isSurplus ? 'EXPORTING ↑' : 'IMPORTING ↓'}
            </span>
          </div>

          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">P2P Tariff</span>
            <span className="font-mono text-sm font-bold text-emerald-600 block">
              ₹{p2pTariff.toFixed(2)}/kWh
            </span>
          </div>
        </div>
      </div>

      {/* Conditional Section: Surplus Exporter vs Deficit Consumer */}
      {isSurplus ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Surplus Energy Routing & P2P Selling
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              +{surplusKw.toFixed(2)} kW Available
            </span>
          </div>

          <form onSubmit={handleSellP2P} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Sell Volume (kWh):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={Math.max(0.1, surplusKw)}
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold text-slate-800 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tariff (₹/kWh):</label>
                <input
                  type="number"
                  step="0.1"
                  min="2.0"
                  max="10.0"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold text-emerald-700 focus:outline-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Gross Proceeds:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{((parseFloat(sellAmount) || 0) * (parseFloat(sellPrice) || 0)).toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="submit"
                className="flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>LIST ON P2P</span>
              </button>

              <button
                type="button"
                onClick={() => onExportToGrid(parseFloat(sellAmount) || 1.0)}
                className="flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>EXPORT TO GRID</span>
              </button>
            </div>
          </form>

          {sellError && (
            <div className="flex items-start space-x-2 rounded-lg bg-rose-50 p-2.5 border border-rose-200 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{sellError}</span>
            </div>
          )}

          {sellStatus && (
            <div className="flex items-start space-x-2 rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{sellStatus}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Energy Deficit & Green Sourcing
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {deficitKw.toFixed(2)} kW Deficit
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-2.5">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-purple-900">P2P Peer Rate</span>
                <span className="rounded bg-purple-200 px-1 py-0.2 text-[9px] font-bold text-purple-800">CHEAPEST</span>
              </div>
              <div className="font-mono text-sm font-bold text-purple-950">₹{p2pTariff.toFixed(2)}/kWh</div>
              <p className="text-[10px] text-purple-700 mt-1">Saves ₹{(gridTariff - p2pTariff).toFixed(2)}/kWh</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <span className="font-bold text-slate-700 block mb-1">Utility Grid</span>
              <div className="font-mono text-sm font-bold text-slate-900">₹{gridTariff.toFixed(2)}/kWh</div>
              <p className="text-[10px] text-slate-500 mt-1">Standard DISCOM tariff</p>
            </div>
          </div>

          <form onSubmit={handleBuyP2P} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2.5">
            <div className="flex items-center space-x-2">
              <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">Buy Energy (kWh):</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold text-slate-800 text-xs focus:outline-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="submit"
                className="flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>BUY P2P GREEN</span>
              </button>

              <button
                type="button"
                onClick={() => onImportFromGrid(parseFloat(buyAmount) || 1.0)}
                className="flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>DRAW FROM GRID</span>
              </button>
            </div>
          </form>

          {buyError && (
            <div className="flex items-start space-x-2 rounded-lg bg-rose-50 p-2.5 border border-rose-200 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{buyError}</span>
            </div>
          )}

          {buyStatus && (
            <div className="flex items-start space-x-2 rounded-lg bg-purple-50 p-2.5 border border-purple-200 text-xs text-purple-800">
              <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{buyStatus}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
