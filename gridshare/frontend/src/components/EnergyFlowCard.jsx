import React from 'react';
import { Sun, Home, BatteryCharging, Network, ArrowRight, Zap } from 'lucide-react';

export default function EnergyFlowCard({
  totalGen = 6.8,
  totalCon = 4.0,
  p2pTraded = 2.8,
  batteryStored = 1.2,
  gridExport = 0.7,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Microgrid Power Flow Dynamics</h3>
          <p className="text-xs text-slate-500 font-medium">Real-time solar routing and balance dispatch</p>
        </div>
        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
          Optimal Dispatch
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Source: Solar Generation */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm mb-2">
            <Sun className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Solar Ingestion</span>
          <span className="text-xl font-extrabold text-amber-600 mt-1">{totalGen.toFixed(2)} kW</span>
          <span className="text-[11px] text-slate-500 mt-0.5">Active Prosumers</span>
        </div>

        {/* Node: Local P2P Sharing */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm mb-2">
            <Zap className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">P2P Shared</span>
          <span className="text-xl font-extrabold text-emerald-700 mt-1">{p2pTraded.toFixed(2)} kW</span>
          <span className="text-[11px] text-slate-500 mt-0.5">Direct Neighbor Trade</span>
        </div>

        {/* Node: Battery Buffer */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-sm mb-2">
            <BatteryCharging className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Storage Injection</span>
          <span className="text-xl font-extrabold text-teal-700 mt-1">{batteryStored.toFixed(2)} kW</span>
          <span className="text-[11px] text-slate-500 mt-0.5">50 kWh Storage Tank</span>
        </div>

        {/* Node: Utility Grid Interface */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-sm mb-2">
            <Network className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Grid Interaction</span>
          <span className="text-xl font-extrabold text-slate-800 mt-1">{gridExport.toFixed(2)} kW</span>
          <span className="text-[11px] text-slate-500 mt-0.5">Export / Feed-In</span>
        </div>
      </div>
    </div>
  );
}
