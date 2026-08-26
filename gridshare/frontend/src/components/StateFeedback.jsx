import React from 'react';
import { RefreshCw, AlertCircle, Inbox } from 'lucide-react';

export function LoadingState({ message = "Loading microgrid telemetry..." }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
      <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
      <h4 className="text-sm font-bold text-slate-800">{message}</h4>
      <p className="text-xs text-slate-500 mt-1">Connecting to local node services...</p>
    </div>
  );
}

export function ErrorState({ message = "Failed to load service data.", onRetry }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center rounded-xl border border-rose-200 bg-rose-50/50">
      <AlertCircle className="h-8 w-8 text-rose-600 mb-3" />
      <h4 className="text-sm font-bold text-rose-900">{message}</h4>
      <p className="text-xs text-rose-700 mt-1">Ensure backend server is running on port 5000.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition active:scale-95"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = "No data recorded", description = "No items or records found in this view." }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-200 bg-white">
      <Inbox className="h-8 w-8 text-slate-400 mb-2" />
      <h4 className="text-sm font-bold text-slate-700">{title}</h4>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
}
