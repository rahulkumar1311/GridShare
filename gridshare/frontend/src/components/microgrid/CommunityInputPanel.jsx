import React from 'react';
import {
  Sun,
  Home,
  BatteryCharging,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  IndianRupee,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function CommunityInputPanel({
  values,
  onChange,
  errors = {},
  onRunGridshare,
  onLoadDemo,
  onReset,
  onDemoMode,
  isProcessing = false,
  isSimulating = false,
}) {
  const handleChange = (field, subfield, val) => {
    onChange(field, subfield, val);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Community Input Panel
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Configure real-time telemetry inputs & run microgrid routing
            </p>
          </div>
        </div>

        <button
          onClick={onLoadDemo}
          disabled={isProcessing}
          className="flex items-center space-x-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition active:scale-95 disabled:opacity-50"
          title="Load standard demo scenario (House A 6.8/2.1, House B 1.2/4.0, Battery 20kWh/40%, Grid ₹6)"
        >
          <Sparkles className="h-3 w-3 text-amber-600" />
          <span>Load Demo Data</span>
        </button>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3.5">
        {/* House A Card */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11.5px] font-extrabold text-slate-900">House A</span>
            </div>
            <span className="rounded bg-emerald-100/80 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-300">
              Solar Champion
            </span>
          </div>

          <div className="space-y-1.5">
            <div>
              <label className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                <span>Solar Generation</span>
                <span className="font-mono text-slate-400">kW</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={values.houseA.generation}
                onChange={(e) => handleChange('houseA', 'generation', e.target.value)}
                disabled={isProcessing}
                className={`w-full rounded-lg border px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-white transition focus:outline-none focus:ring-1.5 ${
                  errors.houseAGen ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-emerald-500'
                }`}
              />
              {errors.houseAGen && (
                <p className="text-[9px] text-rose-500 font-semibold mt-0.5">{errors.houseAGen}</p>
              )}
            </div>

            <div>
              <label className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                <span>Consumption</span>
                <span className="font-mono text-slate-400">kW</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={values.houseA.consumption}
                onChange={(e) => handleChange('houseA', 'consumption', e.target.value)}
                disabled={isProcessing}
                className={`w-full rounded-lg border px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-white transition focus:outline-none focus:ring-1.5 ${
                  errors.houseACon ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-emerald-500'
                }`}
              />
              {errors.houseACon && (
                <p className="text-[9px] text-rose-500 font-semibold mt-0.5">{errors.houseACon}</p>
              )}
            </div>
          </div>
        </div>

        {/* House B Card */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <Home className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11.5px] font-extrabold text-slate-900">House B</span>
            </div>
            <span className="rounded bg-blue-100/80 px-1.5 py-0.2 text-[9px] font-bold text-blue-800 border border-blue-300">
              EV Consumer
            </span>
          </div>

          <div className="space-y-1.5">
            <div>
              <label className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                <span>Solar Generation</span>
                <span className="font-mono text-slate-400">kW</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={values.houseB.generation}
                onChange={(e) => handleChange('houseB', 'generation', e.target.value)}
                disabled={isProcessing}
                className={`w-full rounded-lg border px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-white transition focus:outline-none focus:ring-1.5 ${
                  errors.houseBGen ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-emerald-500'
                }`}
              />
              {errors.houseBGen && (
                <p className="text-[9px] text-rose-500 font-semibold mt-0.5">{errors.houseBGen}</p>
              )}
            </div>

            <div>
              <label className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                <span>Consumption</span>
                <span className="font-mono text-slate-400">kW</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={values.houseB.consumption}
                onChange={(e) => handleChange('houseB', 'consumption', e.target.value)}
                disabled={isProcessing}
                className={`w-full rounded-lg border px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-white transition focus:outline-none focus:ring-1.5 ${
                  errors.houseBCon ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-emerald-500'
                }`}
              />
              {errors.houseBCon && (
                <p className="text-[9px] text-rose-500 font-semibold mt-0.5">{errors.houseBCon}</p>
              )}
            </div>
          </div>
        </div>

        {/* Community Battery Card */}
        <div className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <BatteryCharging className="h-3.5 w-3.5 text-teal-600" />
              <span className="text-[11.5px] font-extrabold text-slate-900">Community Battery</span>
            </div>
            <span className="rounded bg-teal-100/80 px-1.5 py-0.2 text-[9px] font-bold text-teal-800 border border-teal-300">
              Shared ESS
            </span>
          </div>

          <div className="space-y-1.5">
            <div>
              <label className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                <span>Total Capacity</span>
                <span className="font-mono text-slate-400">kWh</span>
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={values.battery.capacity}
                onChange={(e) => handleChange('battery', 'capacity', e.target.value)}
                disabled={isProcessing}
                className={`w-full rounded-lg border px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-white transition focus:outline-none focus:ring-1.5 ${
                  errors.batteryCap ? 'border-rose-400 focus:ring-rose-400' : 'border-teal-300 focus:ring-teal-500'
                }`}
              />
              {errors.batteryCap && (
                <p className="text-[9px] text-rose-500 font-semibold mt-0.5">{errors.batteryCap}</p>
              )}
            </div>

            <div>
              <label className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                <span>Current SOC</span>
                <span className="font-mono text-slate-400">%</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={values.battery.soc}
                onChange={(e) => handleChange('battery', 'soc', e.target.value)}
                disabled={isProcessing}
                className={`w-full rounded-lg border px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-white transition focus:outline-none focus:ring-1.5 ${
                  errors.batterySoc ? 'border-rose-400 focus:ring-rose-400' : 'border-teal-300 focus:ring-teal-500'
                }`}
              />
              {errors.batterySoc && (
                <p className="text-[9px] text-rose-500 font-semibold mt-0.5">{errors.batterySoc}</p>
              )}
            </div>
          </div>
        </div>

        {/* Utility Grid Card */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <Zap className="h-3.5 w-3.5 text-slate-700" />
              <span className="text-[11.5px] font-extrabold text-slate-900">Utility Grid</span>
            </div>
            <span className="rounded bg-slate-200/80 px-1.5 py-0.2 text-[9px] font-bold text-slate-800 border border-slate-300">
              Interconnect
            </span>
          </div>

          <div className="space-y-1.5">
            <div>
              <label className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                <span>Grid Export Price</span>
                <span className="font-mono text-slate-400">₹/kWh</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={values.grid.exportPrice}
                onChange={(e) => handleChange('grid', 'exportPrice', e.target.value)}
                disabled={isProcessing}
                className={`w-full rounded-lg border px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-white transition focus:outline-none focus:ring-1.5 ${
                  errors.gridPrice ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-emerald-500'
                }`}
              />
              {errors.gridPrice && (
                <p className="text-[9px] text-rose-500 font-semibold mt-0.5">{errors.gridPrice}</p>
              )}
            </div>

            <div className="rounded-lg bg-emerald-50/80 border border-emerald-200/60 p-1.5 text-[10px] text-emerald-800">
              <span className="font-bold">P2P Tariff: </span>
              <span className="font-mono font-extrabold">₹4.50/kWh</span>
              <p className="text-[9px] text-emerald-700 font-medium mt-0.2">
                Saves ₹1.50/kWh vs. Grid export
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center space-x-2">
          <button
            onClick={onRunGridshare}
            disabled={isProcessing}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-2 text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : 'fill-current'}`} />
            <span>{isProcessing ? 'Processing Routing...' : 'RUN GRIDSHARE'}</span>
          </button>

          <button
            onClick={onDemoMode}
            disabled={isProcessing}
            className="flex items-center space-x-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-bold shadow-xs transition active:scale-95 border border-amber-600 disabled:opacity-50"
            title="Auto-load standard demo preset and execute complete simulation sequence"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>DEMO MODE</span>
          </button>

          {isSimulating && (
            <button
              onClick={onRunGridshare}
              disabled={isProcessing}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-3.5 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
              <span>RUN AGAIN</span>
            </button>
          )}
        </div>

        <button
          onClick={onReset}
          disabled={isProcessing}
          className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
