import React from 'react';
import { History, CheckCircle2, Clock } from 'lucide-react';
import StatusBadge from '../StatusBadge';

export default function HomeActivityLog({ activities = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
        <div className="flex items-center space-x-2">
          <History className="h-4 w-4 text-slate-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            My Home Energy Activity History
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold font-mono text-slate-600">
          {activities.length} Recorded Events
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-400 bg-slate-50/60">
            <tr>
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Action</th>
              <th className="py-2 px-3">Energy</th>
              <th className="py-2 px-3">Source</th>
              <th className="py-2 px-3">Destination</th>
              <th className="py-2 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activities.length > 0 ? (
              activities.map((act, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition">
                  <td className="py-2 px-3 font-mono text-slate-500">{act.time}</td>
                  <td className="py-2 px-3 font-bold text-slate-800">
                    <span className="flex items-center space-x-1.5">
                      <span>{act.action}</span>
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-900">
                    {act.energy ? `${act.energy} kWh` : '—'}
                  </td>
                  <td className="py-2 px-3 text-slate-600">{act.source}</td>
                  <td className="py-2 px-3 text-slate-600">{act.destination}</td>
                  <td className="py-2 px-3 text-right">
                    <span className="inline-flex items-center space-x-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{act.status || 'COMPLETED'}</span>
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No activity events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
