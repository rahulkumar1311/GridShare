import React from 'react';
import { Cpu, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';

export default function MLPredictionCard({ predictions = [], onRunPredictions, isRunning }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Random Forest ML Forecast</h3>
            <p className="text-xs text-gray-400">Next 6-hour community demand & solar horizon</p>
          </div>
        </div>
        <button
          onClick={onRunPredictions}
          disabled={isRunning}
          className="flex items-center space-x-1.5 rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs font-semibold text-purple-300 border border-purple-500/30 transition hover:bg-purple-600/30 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Inferring...' : 'Re-run Model'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {predictions.slice(0, 6).map((pred, i) => {
          const timeLabel = pred.prediction_time ? new Date(pred.prediction_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `+${i+1}h`;
          const net = pred.predicted_generation_kw - pred.predicted_demand_kw;
          return (
            <div key={pred.id || i} className="rounded-xl border border-gray-800/80 bg-gray-800/40 p-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{timeLabel}</span>
                <span className="font-mono text-[10px] text-purple-400 font-semibold">{((pred.confidence || 0.94) * 100).toFixed(0)}% conf</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-amber-400">{pred.predicted_generation_kw?.toFixed(1)}kW</span>
                  <span className="mx-1 text-gray-500">/</span>
                  <span className="text-xs text-blue-400">{pred.predicted_demand_kw?.toFixed(1)}kW</span>
                </div>
                <span className={`text-xs font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {net >= 0 ? `+${net.toFixed(1)}` : net.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
