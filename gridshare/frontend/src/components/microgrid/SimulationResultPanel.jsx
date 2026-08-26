import React, { useState } from 'react';
import {
  Zap,
  TrendingUp,
  BatteryCharging,
  ArrowRight,
  ShieldCheck,
  Scale,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  CheckCircle2
} from 'lucide-react';

export default function SimulationResultPanel({ metrics = {}, houses = [] }) {
  const [showOwnership, setShowOwnership] = useState(false);

  const totalSurplus = metrics.totalSurplus || 0;
  const localTrade = metrics.localTradeKw || 0;
  const batteryAlloc = metrics.batteryAllocationKw || 0;
  const gridExport = metrics.gridExportKw || 0;
  const totalAllocated = metrics.totalAllocatedKw || 0;
  const unallocated = metrics.unallocatedKw || 0;
  const decisionTitle = metrics.decisionTitle || 'BALANCED IDLE';
  const initialSoc = metrics.initialSoc || 40;
  const finalSoc = metrics.finalBatterySoc || initialSoc;
  const batteryCap = metrics.batteryCapacity || 20;

  const houseA = houses[0] || {};
  const houseB = houses[1] || {};

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-card space-y-3.5">
      {/* Header & Decision Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              GridShare Result
            </h3>
          </div>
          <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
            Deterministic energy dispatch & multi-tier allocation summary
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-[10.5px] font-bold text-slate-500 uppercase">Decision:</span>
          <span className="rounded-full bg-emerald-50 border border-emerald-300 px-3 py-0.5 text-xs font-mono font-extrabold text-emerald-800 shadow-xs">
            {decisionTitle}
          </span>
        </div>
      </div>

      {/* Primary Metrics 4-Column Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Community Surplus */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-medium">
            <span>Community Surplus</span>
            <span className="text-amber-600 font-bold">☀️</span>
          </div>
          <div className="mt-1 font-mono text-base font-extrabold text-amber-900">
            +{totalSurplus.toFixed(1)} <span className="text-[11px] font-normal text-slate-500">kW</span>
          </div>
          <span className="text-[9.5px] text-slate-500 font-medium">
            {houseA.name || 'House A'}: +{houseA.netEnergy > 0 ? houseA.netEnergy.toFixed(1) : 0} kW
          </span>
        </div>

        {/* Local Trade */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-medium">
            <span>Local P2P Trade</span>
            <span className="text-emerald-600 font-bold">🤝</span>
          </div>
          <div className="mt-1 font-mono text-base font-extrabold text-emerald-800">
            {localTrade.toFixed(1)} <span className="text-[11px] font-normal text-slate-500">kW</span>
          </div>
          <span className="text-[9.5px] text-emerald-700 font-medium">
            House A → House B @ ₹4.50
          </span>
        </div>

        {/* Battery Allocation */}
        <div className="rounded-xl border border-teal-200/80 bg-teal-50/50 p-2.5">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-medium">
            <span>Battery Storage</span>
            <span className="text-teal-600 font-bold">🔋</span>
          </div>
          <div className="mt-1 font-mono text-base font-extrabold text-teal-800">
            {batteryAlloc.toFixed(1)} <span className="text-[11px] font-normal text-slate-500">kW</span>
          </div>
          <span className="text-[9.5px] text-teal-700 font-medium">
            SOC {initialSoc}% → {finalSoc}%
          </span>
        </div>

        {/* Grid Export */}
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-2.5">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-medium">
            <span>Grid Export</span>
            <span className="text-blue-600 font-bold">🌐</span>
          </div>
          <div className="mt-1 font-mono text-base font-extrabold text-blue-900">
            {gridExport.toFixed(1)} <span className="text-[11px] font-normal text-slate-500">kW</span>
          </div>
          <span className="text-[9.5px] text-blue-700 font-medium">
            Feed-in @ ₹{metrics.gridPrice?.toFixed(2) || '6.00'}
          </span>
        </div>
      </div>

      {/* Energy Balance Indicator Formula */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <Scale className="h-3.5 w-3.5 text-slate-700" />
            <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wide">
              Energy Balance Equation
            </span>
          </div>
          <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 rounded-full px-2 py-0.2">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>100% Balanced</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="rounded bg-amber-100 border border-amber-300 px-2 py-1 font-bold text-amber-900">
              Input Surplus: {totalSurplus.toFixed(1)} kW
            </span>
            <span className="text-slate-400 font-bold">=</span>
            <span className="rounded bg-emerald-100 border border-emerald-300 px-2 py-1 font-bold text-emerald-900">
              Trade: {localTrade.toFixed(1)}
            </span>
            <span className="text-slate-400 font-bold">+</span>
            <span className="rounded bg-teal-100 border border-teal-300 px-2 py-1 font-bold text-teal-900">
              Battery: {batteryAlloc.toFixed(1)}
            </span>
            <span className="text-slate-400 font-bold">+</span>
            <span className="rounded bg-blue-100 border border-blue-300 px-2 py-1 font-bold text-blue-900">
              Grid: {gridExport.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-slate-600 font-sans font-medium">
              Allocated: <strong className="font-mono text-slate-900">{totalAllocated.toFixed(1)} kW</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-sans font-medium">
              Unallocated: <strong className="font-mono text-slate-900">{unallocated.toFixed(1)} kW</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Community Battery Ownership Section */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <button
          onClick={() => setShowOwnership(!showOwnership)}
          className="flex w-full items-center justify-between p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition rounded-xl"
        >
          <div className="flex items-center space-x-2">
            <Users className="h-3.5 w-3.5 text-teal-600" />
            <span>Community Battery Ownership & Fair Share Accounting</span>
            <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.2 text-[9.5px] font-bold text-teal-800">
              90% Round-Trip Accounting
            </span>
          </div>
          {showOwnership ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showOwnership && (
          <div className="p-3 border-t border-slate-100 text-xs bg-slate-50/50 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-slate-500 text-[10px]">House A Credit Addition</span>
                <div className="font-mono font-bold text-teal-700 mt-0.5">
                  +{batteryAlloc.toFixed(2)} kWh (+{(batteryAlloc * 0.9).toFixed(2)} usable)
                </div>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-slate-500 text-[10px]">Community Tank Energy</span>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {((finalSoc / 100) * batteryCap).toFixed(1)} / {batteryCap} kWh ({finalSoc}%)
                </div>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-slate-500 text-[10px]">Fairness Policy</span>
                <div className="font-mono font-bold text-emerald-700 mt-0.5">
                  Proportional Ownership
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Prosumers earn proportional withdrawal rights based on verified stored energy, preventing unfair depletion.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
