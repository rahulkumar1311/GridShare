import React, { useState, useEffect } from 'react';
import { Sliders, Sun, Power, BatteryCharging, Cloud, RefreshCw, Check, Sparkles } from 'lucide-react';

export default function HomeManualControlPanel({
  solarKw = 4.8,
  demandKw = 2.6,
  batterySoc = 68,
  batteryCapacity = 10,
  cloudCover = false,
  onApplyManualValues,
  onToggleCloudCover,
}) {
  const [inSolar, setInSolar] = useState(solarKw.toString());
  const [inDemand, setInDemand] = useState(demandKw.toString());
  const [inSoc, setInSoc] = useState(batterySoc.toString());
  const [inCapacity, setInCapacity] = useState(batteryCapacity.toString());
  const [isApplied, setIsApplied] = useState(false);

  // Sync internal form when external props change
  useEffect(() => {
    setInSolar(solarKw.toString());
    setInDemand(demandKw.toString());
    setInSoc(batterySoc.toString());
    setInCapacity(batteryCapacity.toString());
  }, [solarKw, demandKw, batterySoc, batteryCapacity]);

  const handleApply = (e) => {
    if (e) e.preventDefault();
    const s = Math.max(0, parseFloat(inSolar) || 0);
    const d = Math.max(0, parseFloat(inDemand) || 0);
    const b = Math.min(100, Math.max(0, parseFloat(inSoc) || 0));
    const c = Math.max(1, parseFloat(inCapacity) || 10);

    onApplyManualValues({
      solarKw: s,
      demandKw: d,
      batterySoc: b,
      batteryCapacity: c,
    });

    setIsApplied(true);
    setTimeout(() => setIsApplied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
        <div className="flex items-center space-x-2">
          <Sliders className="h-4 w-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Manual Energy Override & Simulation
          </h3>
        </div>

        {/* Cloud Cover Simulation Toggle */}
        <button
          onClick={onToggleCloudCover}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
            cloudCover
              ? 'bg-slate-800 text-slate-100 border-slate-700 shadow-xs ring-1 ring-slate-600'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Cloud className={`h-3.5 w-3.5 ${cloudCover ? 'text-blue-300' : 'text-amber-600'}`} />
          <span>{cloudCover ? 'Cloud Cover Active' : 'Simulate Cloud'}</span>
        </button>
      </div>

      <form onSubmit={handleApply} className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Solar Generation Input */}
          <div>
            <label className="flex items-center space-x-1 text-[11px] font-bold text-slate-700 mb-1">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span>Solar Gen (kW):</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={inSolar}
              onChange={(e) => setInSolar(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono font-bold text-slate-800 focus:bg-white focus:outline-emerald-500"
            />
          </div>

          {/* Home Consumption Input */}
          <div>
            <label className="flex items-center space-x-1 text-[11px] font-bold text-slate-700 mb-1">
              <Power className="h-3.5 w-3.5 text-blue-500" />
              <span>Home Load (kW):</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={inDemand}
              onChange={(e) => setInDemand(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono font-bold text-slate-800 focus:bg-white focus:outline-blue-500"
            />
          </div>

          {/* Battery SOC Input */}
          <div>
            <label className="flex items-center space-x-1 text-[11px] font-bold text-slate-700 mb-1">
              <BatteryCharging className="h-3.5 w-3.5 text-emerald-500" />
              <span>Battery SOC (%):</span>
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={inSoc}
              onChange={(e) => setInSoc(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono font-bold text-slate-800 focus:bg-white focus:outline-emerald-500"
            />
          </div>

          {/* Battery Capacity Input */}
          <div>
            <label className="flex items-center space-x-1 text-[11px] font-bold text-slate-700 mb-1">
              <BatteryCharging className="h-3.5 w-3.5 text-teal-500" />
              <span>Capacity (kWh):</span>
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="50"
              value={inCapacity}
              onChange={(e) => setInCapacity(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono font-bold text-slate-800 focus:bg-white focus:outline-teal-500"
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          className={`w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg font-bold text-xs text-white transition-all shadow-xs ${
            isApplied ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          {isApplied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Values Applied & Recalculated!</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>APPLY ENERGY OVERRIDE</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
