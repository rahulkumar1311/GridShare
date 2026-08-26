import React from 'react';

export default function StatCard({
  title,
  value,
  unit = '',
  subtitle,
  icon: Icon,
  accentColor = 'emerald',
  badgeText,
  badgeType = 'neutral'
}) {
  const accentClasses = {
    emerald: 'border-t-emerald-500 text-emerald-600 bg-emerald-50/80',
    solar: 'border-t-amber-500 text-amber-600 bg-amber-50/80',
    blue: 'border-t-blue-500 text-blue-600 bg-blue-50/80',
    purple: 'border-t-purple-500 text-purple-600 bg-purple-50/80',
    rose: 'border-t-rose-500 text-rose-600 bg-rose-50/80',
  }[accentColor] || 'border-t-emerald-500 text-emerald-600 bg-emerald-50/80';

  const badgeClasses = {
    positive: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    negative: 'bg-rose-50 text-rose-800 border-rose-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
  }[badgeType] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className={`rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-card border-t-3 ${accentClasses.split(' ')[0]} transition-all hover:border-slate-300`}>
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accentClasses.split(' ').slice(1).join(' ')}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <div className="flex items-baseline">
          <span className="text-xl font-bold tracking-tight text-slate-900 font-mono">{value}</span>
          {unit && <span className="ml-1 text-[11px] font-bold text-slate-500">{unit}</span>}
        </div>

        {badgeText && (
          <span className={`rounded-md border px-1.5 py-0.2 text-[9.5px] font-bold tracking-tight ${badgeClasses}`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-[10.5px] text-slate-500 font-medium leading-tight">{subtitle}</p>
      )}
    </div>
  );
}
