import React from 'react';
import { ArrowRight, CheckCircle2, Play } from 'lucide-react';

export default function P2PTradingTable({ trades = [], onMatchTrades, isMatching }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Peer-to-Peer Energy Trading Ledger</h3>
          <p className="text-xs text-gray-400">Microgrid internal transactions cleared at ₹4.50/kWh</p>
        </div>
        <button
          onClick={onMatchTrades}
          disabled={isMatching}
          className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 transition hover:bg-emerald-500 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{isMatching ? 'Matching...' : 'Auto-Match Orders'}</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="border-b border-gray-800 text-[11px] font-semibold uppercase text-gray-400">
            <tr>
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Seller</th>
              <th className="py-2 px-3">Buyer</th>
              <th className="py-2 px-3">Volume</th>
              <th className="py-2 px-3">Tariff</th>
              <th className="py-2 px-3">Total (INR)</th>
              <th className="py-2 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {trades.length > 0 ? (
              trades.slice(0, 5).map((t) => (
                <tr key={t.id} className="hover:bg-gray-800/30 transition">
                  <td className="py-2.5 px-3 font-mono text-gray-400">
                    {t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-amber-400">{t.seller_household_id}</td>
                  <td className="py-2.5 px-3 font-medium text-blue-400">{t.buyer_household_id}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{t.energy_kwh?.toFixed(2)} kWh</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">₹{t.price_per_kwh?.toFixed(2)}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">₹{t.total_value?.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{t.status}</span>
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-4 text-center text-gray-500">
                  No recent P2P trades logged yet. Click Auto-Match to clear balances.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
