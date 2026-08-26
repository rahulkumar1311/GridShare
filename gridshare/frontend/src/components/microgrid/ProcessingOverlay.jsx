import React from 'react';
import {
  Zap,
  Search,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Reading Community Energy', icon: Zap },
  { id: 2, label: 'Detecting Surplus & Deficit', icon: Search },
  { id: 3, label: 'Optimizing Allocation', icon: Cpu },
  { id: 4, label: 'Matching Local Demand', icon: RefreshCw },
  { id: 5, label: 'Energy Flow Ready', icon: CheckCircle2 },
];

export default function ProcessingOverlay({ currentStep = 1, currentStatus = '' }) {
  return (
    <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-900/90 via-slate-900/95 to-teal-950/90 p-4 text-white shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-slate-950 animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-400">
            GridShare Optimization Pipeline
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-emerald-300">
          Step {Math.min(5, Math.max(1, currentStep))} of 5
        </span>
      </div>

      {/* Stepper Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex items-center space-x-2 rounded-xl p-2 text-xs transition-all ${
                isCurrent
                  ? 'bg-emerald-500/25 border border-emerald-400 text-white font-bold ring-1 ring-emerald-400/50'
                  : isDone
                  ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                  : 'bg-slate-800/40 border border-slate-700/50 text-slate-400'
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isCurrent
                    ? 'bg-emerald-400 text-slate-950 animate-spin'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.id}
              </div>
              <span className="truncate text-[11px] leading-tight">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Dynamic Status Narrative Box */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/50 px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-emerald-100">
            {currentStatus || 'Processing microgrid optimization hierarchy...'}
          </span>
        </div>
      </div>
    </div>
  );
}
