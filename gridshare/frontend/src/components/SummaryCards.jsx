import React from 'react';
import { Sun, Power, BatteryCharging, ArrowDownUp, TrendingUp, IndianRupee } from 'lucide-react';

export default function SummaryCards({ data }) {
  const energy = data?.energy_summary || {};
  const battery = data?.battery || {};
  const metrics = data?.metrics || {};

  const totalGen = energy.total_community_generation_kw || 0;
  const totalCon = energy.total_community_consumption_kw || 0;
  const netBalance = energy.community_net_balance_kw || 0;
  const batterySoc = battery.current_soc || 0;
  const batteryCap = battery.capacity_kwh || 50;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Solar Generation */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm transition hover:border-amber-500/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Solar Generation</p>
            <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
              {totalGen.toFixed(2)} <span className="text-sm font-normal text-amber-400">kW</span>
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sun className="h-6 w-6" />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">Active Prosumers: {energy.surplus_nodes_count || 0} nodes surplus</p>
      </div>

      {/* Community Demand */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm transition hover:border-blue-500/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Community Demand</p>
            <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
              {totalCon.toFixed(2)} <span className="text-sm font-normal text-blue-400">kW</span>
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Power className="h-6 w-6" />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">Consumers: {energy.deficit_nodes_count || 0} nodes deficit</p>
      </div>

      {/* Community Net Balance */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm transition hover:border-emerald-500/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Microgrid Net Balance</p>
            <h3 className={`mt-2 text-2xl font-bold tracking-tight ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netBalance >= 0 ? `+${netBalance.toFixed(2)}` : netBalance.toFixed(2)} <span className="text-sm font-normal text-gray-300">kW</span>
            </h3>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
            netBalance >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <ArrowDownUp className="h-6 w-6" />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">Self-Sufficiency: <span className="text-emerald-400 font-semibold">{metrics.community_self_sufficiency_pct || 100}%</span></p>
      </div>

      {/* Community Battery Storage */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm transition hover:border-teal-500/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Community Battery</p>
            <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
              {batterySoc.toFixed(0)}% <span className="text-sm font-normal text-teal-400">({((batterySoc/100)*batteryCap).toFixed(1)}/{batteryCap}kWh)</span>
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <BatteryCharging className="h-6 w-6" />
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, batterySoc))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
