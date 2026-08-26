import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  TrendingUp,
  BatteryCharging,
  Zap,
  Activity,
  ArrowRight,
  Sun,
  Layers
} from 'lucide-react';

export default function DashboardAnalyticsSection({
  chartHistory = [],
  currentFlows = [],
  battery = {},
}) {
  const [activeTab, setActiveTab] = useState('GEN_CON'); // 'GEN_CON', 'BATTERY_SOC', 'ENERGY_FLOWS'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card space-y-2.5">
      {/* Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-white shadow-2xs">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Interactive Microgrid Analytics
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Continuous time-series telemetry & energy balance curves
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
          <button
            onClick={() => setActiveTab('GEN_CON')}
            className={`px-2.5 py-1 rounded-md transition text-[11px] ${
              activeTab === 'GEN_CON' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Generation vs Load
          </button>
          <button
            onClick={() => setActiveTab('BATTERY_SOC')}
            className={`px-2.5 py-1 rounded-md transition text-[11px] ${
              activeTab === 'BATTERY_SOC' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Battery SOC Curve
          </button>
          <button
            onClick={() => setActiveTab('ENERGY_FLOWS')}
            className={`px-2.5 py-1 rounded-md transition text-[11px] ${
              activeTab === 'ENERGY_FLOWS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Flow Allocations
          </button>
        </div>
      </div>

      {/* 1. GENERATION VS CONSUMPTION PROFILE */}
      {activeTab === 'GEN_CON' && (
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartHistory} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} unit=" kW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.5rem', fontSize: '11px' }}
                formatter={(val) => [`${val} kW`]}
              />
              <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              <Area
                type="monotone"
                dataKey="generation"
                name="Solar Generation"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorGen)"
              />
              <Area
                type="monotone"
                dataKey="consumption"
                name="Community Load"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCon)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 2. BATTERY SOC PROGRESSION CURVE */}
      {activeTab === 'BATTERY_SOC' && (
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartHistory} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.5rem', fontSize: '11px' }}
                formatter={(val) => [`${val}% SOC`]}
              />
              <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              <Area
                type="monotone"
                dataKey="batterySoc"
                name="Battery State of Charge (SOC %)"
                stroke="#0d9488"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSoc)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 3. CURRENT ENERGY FLOW BREAKDOWN */}
      {activeTab === 'ENERGY_FLOWS' && (
        <div className="py-2 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {currentFlows.map((flow) => (
              <div
                key={flow.id}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: flow.color || '#059669' }} />
                  <div>
                    <span className="font-bold text-slate-900 text-[11px] block">{flow.label || 'Active Flow'}</span>
                    <span className="text-[9.5px] text-slate-500 font-mono">Dynamic Spline</span>
                  </div>
                </div>
                <span className="font-mono font-extrabold text-sm text-slate-900">
                  {flow.kw?.toFixed(1) || 0} kW
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 font-medium">
            Flows are calculated using the deterministic multi-tier rule engine: Solar Self-Supply ➔ Local P2P Sharing ➔ Central ESS Storage Buffer ➔ Utility Grid Export.
          </p>
        </div>
      )}
    </div>
  );
}
