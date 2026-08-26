import React from 'react';
import {
  Zap,
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Scale,
  CheckCircle2
} from 'lucide-react';

export default function LedgerSummaryCards({
  totalEnergyTraded = 24.6,
  totalP2PValue = 112.40,
  energySold = 14.2,
  energyBought = 10.4,
  settledCount = 12,
  gridTariff = 6.10,
  p2pBenchmark = 4.50,
}) {
  const netEnergy = energySold - energyBought;
  const totalSavings = totalEnergyTraded * (gridTariff - p2pBenchmark);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Energy Traded */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider">Total Energy Traded</span>
          <Zap className="h-4 w-4 text-amber-500" />
        </div>
        <div className="font-mono text-lg font-black text-slate-900 mt-0.5">
          {totalEnergyTraded.toFixed(1)} <span className="text-xs font-bold text-slate-400">kWh</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">Across all local peers</div>
      </div>

      {/* 2. Total P2P Value */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider">Total Cleared Value</span>
          <IndianRupee className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="font-mono text-lg font-black text-emerald-700 mt-0.5">
          ₹{totalP2PValue.toFixed(2)}
        </div>
        <div className="text-[10px] text-slate-500 mt-1">Direct peer settlements</div>
      </div>

      {/* 3. Energy Sold */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider">Energy Sold</span>
          <ArrowUpRight className="h-4 w-4 text-amber-600" />
        </div>
        <div className="font-mono text-lg font-black text-amber-700 mt-0.5">
          {energySold.toFixed(1)} <span className="text-xs font-bold text-slate-400">kWh</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">Rooftop solar surplus</div>
      </div>

      {/* 4. Energy Bought */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider">Energy Bought</span>
          <ArrowDownLeft className="h-4 w-4 text-blue-600" />
        </div>
        <div className="font-mono text-lg font-black text-blue-700 mt-0.5">
          {energyBought.toFixed(1)} <span className="text-xs font-bold text-slate-400">kWh</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">Consumer green sourcing</div>
      </div>

      {/* 5. Settled Transactions */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider">Settled Trades</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="font-mono text-lg font-black text-slate-900 mt-0.5">
          {settledCount} <span className="text-xs font-bold text-slate-400">txns</span>
        </div>
        <div className="text-[10px] text-emerald-700 font-semibold mt-1">100% Cleared & Verified</div>
      </div>

      {/* 6. Community Savings */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-emerald-800 mb-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider">Tariff Savings</span>
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="font-mono text-lg font-black text-emerald-800 mt-0.5">
          ₹{totalSavings.toFixed(2)}
        </div>
        <div className="text-[10px] text-emerald-700 font-semibold mt-1">vs ₹{gridTariff.toFixed(2)} utility rate</div>
      </div>
    </div>
  );
}
