import React from 'react';
import {
  Home,
  Sliders,
  Sparkles,
  RotateCcw,
  Wallet,
  BatteryCharging,
  Zap
} from 'lucide-react';

export default function CommunityHouseholdInput({
  computedHouseholds = [],
  battery = {},
  grid = {},
  onUpdateHousehold,
  onStoreSurplus,
  onExportSurplus,
  onLoadDemo,
  onResetSimulation,
  disabled = false,
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-card space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <div className="flex items-center space-x-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-800 text-white shadow-2xs">
            <Sliders className="h-3 w-3" />
          </div>
          <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-900">
            Community Nodes
          </span>
        </div>

        <button
          onClick={onLoadDemo}
          disabled={disabled}
          className="flex items-center space-x-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-800 hover:bg-amber-100 transition active:scale-95 disabled:opacity-50"
          title="Reset to default demo data"
        >
          <Sparkles className="h-2.5 w-2.5 text-amber-600" />
          <span>Demo Data</span>
        </button>
      </div>

      {/* Household Nodes */}
      <div className="space-y-1.5">
        {computedHouseholds.map((h) => {
          const isSurplus = h.status === 'SURPLUS';
          const isDeficit = h.status === 'DEFICIT';

          return (
            <div
              key={h.id}
              className={`rounded-lg border p-1.5 text-xs transition ${
                isSurplus
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : isDeficit
                  ? 'border-rose-200 bg-rose-50/20'
                  : 'border-slate-200 bg-slate-50/40'
              }`}
            >
              {/* Header: Name, Net, Wallet */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1">
                  <span className="font-extrabold text-[11px] text-slate-900">{h.name}</span>
                  <span className="text-[9px] text-slate-400">({h.type.split(' ')[0]})</span>
                </div>

                <div className="flex items-center space-x-1">
                  <span
                    className={`rounded border px-1 py-0.1 text-[8.5px] font-mono font-bold uppercase ${
                      isSurplus
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isDeficit
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {isSurplus ? `+${h.netEnergy.toFixed(1)}` : h.netEnergy.toFixed(1)} kW
                  </span>

                  <span className="font-mono font-bold text-slate-700 text-[9.5px]">
                    ₹{h.wallet.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Gen & Con Inputs */}
              <div className="grid grid-cols-2 gap-1 mb-1">
                <div className="flex items-center space-x-1">
                  <span className="text-[9px] text-slate-500 font-medium">Gen:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={h.generation}
                    onChange={(e) => onUpdateHousehold(h.id, 'generation', e.target.value)}
                    disabled={disabled}
                    className="w-full rounded border border-slate-300 bg-white px-1 py-0.5 text-[10.5px] font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-[9px] text-slate-500 font-medium">Load:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={h.consumption}
                    onChange={(e) => onUpdateHousehold(h.id, 'consumption', e.target.value)}
                    disabled={disabled}
                    className="w-full rounded border border-slate-300 bg-white px-1 py-0.5 text-[10.5px] font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Surplus Actions */}
              {isSurplus && h.availableSurplus > 0.05 && (
                <div className="flex items-center justify-between pt-1 border-t border-emerald-100 text-[9.5px]">
                  <span className="font-mono font-bold text-emerald-800">
                    Avail: +{h.availableSurplus.toFixed(1)} kWh
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onStoreSurplus(h.id)}
                      disabled={disabled}
                      className="rounded bg-teal-600 hover:bg-teal-700 text-white px-1.5 py-0.5 font-bold transition active:scale-95 disabled:opacity-50"
                      title="Store in Community Battery"
                    >
                      Store
                    </button>
                    <button
                      onClick={() => onExportSurplus(h.id)}
                      disabled={disabled}
                      className="rounded bg-blue-600 hover:bg-blue-700 text-white px-1.5 py-0.5 font-bold transition active:scale-95 disabled:opacity-50"
                      title="Export to Utility Grid"
                    >
                      Export
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Battery & Grid Status summary */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-1.5 text-xs flex items-center justify-between">
        <div className="flex items-center space-x-1 text-[10px]">
          <BatteryCharging className="h-3 w-3 text-teal-600" />
          <span className="font-bold text-slate-800">Battery:</span>
          <span className="font-mono font-bold text-teal-900">{battery.soc?.toFixed(0)}% SOC</span>
        </div>
        <div className="text-[10px] font-mono text-slate-600">
          Grid: ₹{grid.exportPrice?.toFixed(1)}/kWh
        </div>
      </div>
    </div>
  );
}
