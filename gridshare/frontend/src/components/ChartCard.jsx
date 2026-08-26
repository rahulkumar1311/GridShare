import React from 'react';

export default function ChartCard({
  title,
  subtitle,
  headerRight,
  children,
  className = ""
}) {
  return (
    <div className={`rounded-xl border border-slate-200/90 bg-white p-4 shadow-card ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2.5 border-b border-slate-100 mb-3 gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {headerRight && (
          <div className="flex items-center space-x-2">
            {headerRight}
          </div>
        )}
      </div>

      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
