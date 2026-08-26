import React from 'react';
import { Network, Home, BatteryCharging, Radio, Zap } from 'lucide-react';

export default function LedgerNetworkGraph({ activeTradesCount = 4 }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
        <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-800 uppercase tracking-wider">
          <Network className="h-4 w-4 text-emerald-600" />
          <span>Active Peer-to-Peer Energy Settlement Topology</span>
        </div>
        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
          {activeTradesCount} Active Bilateral Routes
        </span>
      </div>

      {/* SVG Lightweight 2.5D Network Graph */}
      <div className="relative h-32 w-full rounded-lg bg-slate-950/95 overflow-hidden flex items-center justify-center p-2">
        <svg className="w-full h-full" viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Animated Connecting Pathways */}
          <path d="M 100 60 Q 250 15 400 40" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" className="animate-pulse" />
          <path d="M 100 60 Q 200 95 300 90" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.7" />
          <path d="M 220 30 Q 310 15 400 40" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />
          <path d="M 400 40 Q 460 70 520 60" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />

          {/* Node 1: House A (Solar Champion) */}
          <g transform="translate(100, 60)">
            <circle r="18" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
            <text y="4" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">PV A</text>
            <text y="28" textAnchor="middle" fill="#94a3b8" fontSize="9">Seller</text>
          </g>

          {/* Node 2: House C (Prosumer) */}
          <g transform="translate(220, 30)">
            <circle r="16" fill="#1e293b" stroke="#8b5cf6" strokeWidth="2" />
            <text y="4" textAnchor="middle" fill="#c084fc" fontSize="9" fontWeight="bold">PV C</text>
            <text y="26" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Prosumer</text>
          </g>

          {/* Node 3: Community Battery */}
          <g transform="translate(300, 90)">
            <circle r="16" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
            <text y="4" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold">ESS</text>
            <text y="26" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Battery</text>
          </g>

          {/* Node 4: House B (EV Consumer) */}
          <g transform="translate(400, 40)">
            <circle r="18" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <text y="4" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">EV B</text>
            <text y="28" textAnchor="middle" fill="#94a3b8" fontSize="9">Buyer</text>
          </g>

          {/* Node 5: Utility Grid */}
          <g transform="translate(520, 60)">
            <circle r="16" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
            <text y="4" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="bold">GRID</text>
            <text y="26" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Utility</text>
          </g>
        </svg>

        {/* Small Overlay Legend */}
        <div className="absolute bottom-1.5 right-3 flex items-center space-x-3 text-[9.5px] font-mono text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Solar P2P</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>ESS Storage</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Grid Feed</span>
          </span>
        </div>
      </div>
    </div>
  );
}
