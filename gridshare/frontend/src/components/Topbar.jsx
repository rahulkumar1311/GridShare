import React from 'react';
import { RefreshCw, Play, BatteryCharging, IndianRupee, Sparkles } from 'lucide-react';

export default function Topbar({
  title = "Dashboard",
  subtitle = "Real-time microgrid metrics & automated P2P clearing",
  onRefresh,
  isRefreshing = false,
  onTriggerOptimization,
  isOptimizing = false,
  onOpenDemoModal,
  batterySoc = 40,
  gridPrice = 6.10,
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur-sm">
      <div>
        <h1 className="text-sm font-bold text-slate-900 leading-tight">{title}</h1>
        <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-2.5">
        {/* Demo Mode Launcher Button */}
        {onOpenDemoModal && (
          <button
            onClick={onOpenDemoModal}
            className="flex items-center space-x-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 text-xs font-bold shadow-xs transition active:scale-95 border border-amber-600"
          >
            <Sparkles className="h-3 w-3" />
            <span>Demo Mode</span>
          </button>
        )}

        {/* Live Grid Price Benchmark */}
        <div className="hidden lg:flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
          <IndianRupee className="h-3 w-3 text-slate-500" />
          <span className="text-slate-600 font-medium text-[11px]">Grid:</span>
          <span className="font-bold text-slate-900 text-[11px]">₹{gridPrice.toFixed(2)}/kWh</span>
          <span className="text-emerald-700 font-bold ml-0.5 text-[10px]">(P2P: ₹4.50)</span>
        </div>

        {/* Battery SOC Pill */}
        <div className="hidden md:flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
          <BatteryCharging className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-slate-600 font-medium text-[11px]">Storage:</span>
          <span className="font-bold text-slate-900 text-[11px]">{batterySoc.toFixed(0)}%</span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
            title="Refresh live telemetry"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-[11px]">Sync</span>
          </button>
        )}

        {/* Trigger Energy Routing */}
        {onTriggerOptimization && (
          <button
            onClick={onTriggerOptimization}
            disabled={isOptimizing}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>{isOptimizing ? 'Routing...' : 'Route Energy'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
