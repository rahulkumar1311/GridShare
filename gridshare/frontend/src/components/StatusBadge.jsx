import React from 'react';

export default function StatusBadge({ status, label }) {
  const norm = (status || '').toUpperCase();
  const text = label || norm;

  const styleMap = {
    SURPLUS: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    DEFICIT: 'bg-rose-50 text-rose-800 border-rose-200',
    BALANCED: 'bg-slate-100 text-slate-700 border-slate-200',
    PROSUMER: 'bg-amber-50 text-amber-800 border-amber-200',
    CONSUMER: 'bg-blue-50 text-blue-800 border-blue-200',
    OPEN: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    FILLED: 'bg-slate-100 text-slate-700 border-slate-200',
    PARTIALLY_FILLED: 'bg-amber-50 text-amber-800 border-amber-200',
    COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    STORE: 'bg-teal-50 text-teal-800 border-teal-200',
    LOCAL_TRADE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    GRID_EXPORT: 'bg-amber-50 text-amber-800 border-amber-200',
    GRID_IMPORT: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const badgeClass = styleMap[norm] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono tracking-tight ${badgeClass}`}>
      {text}
    </span>
  );
}
