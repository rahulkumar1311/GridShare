import React from 'react';
import { Home, Sun, Zap } from 'lucide-react';

export default function NodeStatusGrid({ nodes = [] }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">Live Community Node Telemetry</h3>
        <p className="text-xs text-gray-400">Microgrid nodes live state, solar output, and active loads</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {nodes.map((n) => {
          const isSurplus = (n.net_balance_kw || 0) >= 0;
          return (
            <div
              key={n.household_id}
              className="flex flex-col justify-between rounded-xl border border-gray-800 bg-gray-800/40 p-4 transition hover:border-gray-700"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">{n.household_name || n.household_id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isSurplus ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {n.household_type || (isSurplus ? 'PROSUMER' : 'CONSUMER')}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Solar Gen:</span>
                    <span className="font-mono text-amber-400">{n.generation_kw?.toFixed(2)} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Demand:</span>
                    <span className="font-mono text-blue-400">{n.consumption_kw?.toFixed(2)} kW</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-gray-800/80 pt-2 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Net:</span>
                <span className={`text-xs font-bold font-mono ${isSurplus ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isSurplus ? `+${n.net_balance_kw?.toFixed(2)}` : n.net_balance_kw?.toFixed(2)} kW
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
