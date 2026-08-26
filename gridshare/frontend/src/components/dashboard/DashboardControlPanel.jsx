import React from 'react';
import {
  Sliders,
  Sparkles,
  RotateCcw,
  Play,
  Clock,
  Sun,
  Zap,
  BatteryCharging,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { PRESET_SCENARIOS } from '../../services/dashboardSimulationEngine';

export default function DashboardControlPanel({
  households = [],
  battery = {},
  grid = {},
  currentHour = 12,
  activeScenario = 'NORMAL_DAY',
  onUpdateHousehold,
  onUpdateBattery,
  onUpdateGrid,
  onApplyScenario,
  onChangeHour,
  onRunSimulation,
  onReset,
  onLoadDemo,
  disabled = false,
}) {
  const scenarioKeys = Object.keys(PRESET_SCENARIOS);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card space-y-3 select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <div className="flex items-center space-x-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-white shadow-2xs">
            <Sliders className="h-3 w-3" />
          </div>
          <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-900">
            Microgrid Controls
          </span>
        </div>
        <button
          onClick={onLoadDemo}
          disabled={disabled}
          className="flex items-center space-x-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-800 hover:bg-amber-100 transition active:scale-95 disabled:opacity-50"
        >
          <Sparkles className="h-2.5 w-2.5 text-amber-600" />
          <span>Demo Data</span>
        </button>
      </div>

      {/* Preset Scenarios Switcher */}
      <div>
        <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
          Scenarios
        </span>
        <div className="grid grid-cols-2 gap-1">
          {scenarioKeys.map((key) => {
            const sc = PRESET_SCENARIOS[key];
            const isActive = activeScenario === key;
            return (
              <button
                key={key}
                onClick={() => onApplyScenario(key)}
                disabled={disabled}
                className={`truncate rounded px-1.5 py-1 text-[10px] font-bold transition active:scale-95 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title={sc.description}
              >
                {sc.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Time Stepper (06:00 to 22:00) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
          <span className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-slate-500" />
            <span>Simulated Time:</span>
          </span>
          <span className="font-mono text-emerald-800 font-extrabold text-xs">
            {String(currentHour).padStart(2, '0')}:00
          </span>
        </div>

        <div className="flex items-center space-x-1.5 pt-0.5">
          <button
            onClick={() => onChangeHour(Math.max(6, currentHour - 1))}
            disabled={currentHour <= 6 || disabled}
            className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <input
            type="range"
            min="6"
            max="22"
            value={currentHour}
            onChange={(e) => onChangeHour(Number(e.target.value))}
            disabled={disabled}
            className="flex-1 accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
          />

          <button
            onClick={() => onChangeHour(Math.min(22, currentHour + 1))}
            disabled={currentHour >= 22 || disabled}
            className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Household Telemetry Inputs */}
      <div className="space-y-1.5">
        <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
          Community Nodes
        </span>

        {households.map((h) => {
          const isSurplus = (h.generation - h.consumption) > 0.001;
          const isDeficit = (h.generation - h.consumption) < -0.001;
          const net = Math.round((h.generation - h.consumption) * 10) / 10;

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
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-[11px] text-slate-900">{h.name}</span>
                <span
                  className={`rounded border px-1 py-0.1 text-[8.5px] font-mono font-bold uppercase ${
                    isSurplus
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : isDeficit
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {isSurplus ? `+${net.toFixed(1)}` : net.toFixed(1)} kW
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1">
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
            </div>
          );
        })}
      </div>

      {/* Battery & Grid Configuration */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-2 space-y-1.5">
        <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-900">
          <div className="flex items-center space-x-1">
            <BatteryCharging className="h-3.5 w-3.5 text-teal-600" />
            <span>Community Storage</span>
          </div>
          <span className="font-mono text-teal-900 font-bold">{battery.soc?.toFixed(0)}% SOC</span>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <div>
            <span className="text-slate-500">Capacity (kWh):</span>
            <input
              type="number"
              value={battery.capacity || 20}
              onChange={(e) => onUpdateBattery('capacity', e.target.value)}
              disabled={disabled}
              className="w-full rounded border border-teal-300 bg-white px-1 py-0.5 text-[10.5px] font-mono font-bold text-slate-900"
            />
          </div>
          <div>
            <span className="text-slate-500">Grid Tariff (₹):</span>
            <input
              type="number"
              step="0.1"
              value={grid.exportPrice || 6.0}
              onChange={(e) => onUpdateGrid('exportPrice', e.target.value)}
              disabled={disabled}
              className="w-full rounded border border-teal-300 bg-white px-1 py-0.5 text-[10.5px] font-mono font-bold text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button
          onClick={onRunSimulation}
          disabled={disabled}
          className="flex items-center justify-center space-x-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 text-[11px] font-bold shadow-2xs transition active:scale-95 disabled:opacity-50"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>RUN SIMULATION</span>
        </button>

        <button
          onClick={onReset}
          disabled={disabled}
          className="flex items-center justify-center space-x-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-1.5 text-[11px] font-semibold transition active:scale-95 disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3 text-slate-500" />
          <span>RESET</span>
        </button>
      </div>
    </div>
  );
}
