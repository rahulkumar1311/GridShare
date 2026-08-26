import React from 'react';
import StatusBadge from '../StatusBadge';
import { Eye, ArrowUpRight, ArrowDownLeft, Zap, Radio, BatteryCharging } from 'lucide-react';

export default function LedgerTransactionTable({
  transactions = [],
  onSelectTransaction,
  onNavigateMarketplace,
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-card space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Zap className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No Transactions Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          No energy trade records match your active filters. Once you match or complete your first P2P trade, it will appear here.
        </p>
        <button
          onClick={onNavigateMarketplace}
          className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs mt-2"
        >
          <span>GO TO MARKETPLACE</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-400 bg-slate-50/60">
            <tr>
              <th className="py-2.5 px-3">Tx ID</th>
              <th className="py-2.5 px-3">Date / Time</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Prosumer Seller</th>
              <th className="py-2.5 px-3">Consumer Buyer</th>
              <th className="py-2.5 px-3 text-right">Energy Volume</th>
              <th className="py-2.5 px-3 text-right">Unit Tariff</th>
              <th className="py-2.5 px-3 text-right">Total Amount</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const energyVal = tx.energy_kwh || tx.energyKwh || 0;
              const priceVal = tx.price_per_kwh || tx.pricePerKwh || 4.50;
              const totalVal = tx.total_value || tx.totalValue || (energyVal * priceVal);

              const seller = tx.seller_household_id || tx.sellerId || 'House A';
              const buyer = tx.buyer_household_id || tx.buyerId || 'House B';

              const isGrid = tx.type === 'GRID_IMPORT' || tx.type === 'GRID_EXPORT';
              const isBattery = tx.type === 'BATTERY';

              const typeBadge = isGrid ? (
                <span className="inline-flex items-center space-x-1 rounded bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold border border-slate-200">
                  <Radio className="h-3 w-3 text-slate-500" />
                  <span>{tx.type === 'GRID_IMPORT' ? 'GRID IMPORT' : 'GRID EXPORT'}</span>
                </span>
              ) : isBattery ? (
                <span className="inline-flex items-center space-x-1 rounded bg-teal-50 text-teal-800 px-2 py-0.5 text-[10px] font-bold border border-teal-200">
                  <BatteryCharging className="h-3 w-3 text-teal-600" />
                  <span>BATTERY ESS</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 rounded bg-emerald-50 text-emerald-800 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
                  <Zap className="h-3 w-3 text-emerald-600" />
                  <span>P2P TRADE</span>
                </span>
              );

              return (
                <tr
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="hover:bg-slate-50/80 transition cursor-pointer group"
                >
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-500 group-hover:text-slate-900">
                    #TXN-{tx.id}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                    {tx.timestamp
                      ? new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                      : 'Live'}
                  </td>
                  <td className="py-2.5 px-3">{typeBadge}</td>
                  <td className="py-2.5 px-3 font-bold text-amber-800 flex items-center space-x-1">
                    <span>{seller}</span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-blue-800">
                    <span>{buyer}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right">
                    {energyVal.toFixed(2)} kWh
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 text-right">
                    ₹{priceVal.toFixed(2)}/kWh
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 text-right">
                    ₹{totalVal.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={tx.status || 'SETTLED'} />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTransaction(tx);
                      }}
                      className="inline-flex items-center space-x-1 rounded px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition"
                      title="Inspect Transaction"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Details</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
