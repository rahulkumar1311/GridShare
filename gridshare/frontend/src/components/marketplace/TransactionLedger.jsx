import React, { useState } from 'react';
import {
  ReceiptText,
  Wallet,
  Zap,
  CheckCircle2,
  Users,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck
} from 'lucide-react';

export default function TransactionLedger({
  transactions = [],
  computedHouseholds = [],
  battery = {},
}) {
  const [activeSubTab, setActiveSubTab] = useState('TRANSACTIONS'); // 'TRANSACTIONS', 'WALLETS', 'ENERGY_LEDGER', 'OWNERSHIP'

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-card space-y-3">
      {/* Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2.5 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <ReceiptText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Live Settlement & Energy Ledger
            </h3>
            <p className="text-[10.5px] text-slate-500 font-medium">
              Immutable bilateral trade records, simulated wallet balances & energy flows
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('TRANSACTIONS')}
            className={`px-3 py-1 rounded-lg transition ${
              activeSubTab === 'TRANSACTIONS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Trades ({transactions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('WALLETS')}
            className={`px-3 py-1 rounded-lg transition ${
              activeSubTab === 'WALLETS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Wallets
          </button>
          <button
            onClick={() => setActiveSubTab('ENERGY_LEDGER')}
            className={`px-3 py-1 rounded-lg transition ${
              activeSubTab === 'ENERGY_LEDGER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Energy Ledger
          </button>
          <button
            onClick={() => setActiveSubTab('OWNERSHIP')}
            className={`px-3 py-1 rounded-lg transition ${
              activeSubTab === 'OWNERSHIP' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Battery Ownership
          </button>
        </div>
      </div>

      {/* 1. TRANSACTIONS TABLE */}
      {activeSubTab === 'TRANSACTIONS' && (
        <div>
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
              No trades executed yet. Place and match buy/sell orders in the marketplace above.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-2">Trade ID</th>
                    <th className="py-2 px-2">Seller</th>
                    <th className="py-2 px-2">Buyer</th>
                    <th className="py-2 px-2">Energy (kWh)</th>
                    <th className="py-2 px-2">Price (₹/kWh)</th>
                    <th className="py-2 px-2">Total Amount</th>
                    <th className="py-2 px-2">Payment Status</th>
                    <th className="py-2 px-2">Energy Flow</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 text-slate-500 font-sans">{tx.time}</td>
                      <td className="py-2 px-2 font-bold text-slate-900">{tx.id}</td>
                      <td className="py-2 px-2 font-sans font-bold text-emerald-700">{tx.sellerId}</td>
                      <td className="py-2 px-2 font-sans font-bold text-blue-700">{tx.buyerId}</td>
                      <td className="py-2 px-2 font-bold text-slate-900">{tx.energyKwh.toFixed(1)} kWh</td>
                      <td className="py-2 px-2 text-slate-700">₹{tx.pricePerKwh.toFixed(2)}</td>
                      <td className="py-2 px-2 font-bold text-emerald-800">₹{tx.totalValue.toFixed(2)}</td>
                      <td className="py-2 px-2">
                        <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                          {tx.paymentStatus}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[9px] font-bold text-blue-800">
                          {tx.energyFlowStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="flex items-center justify-end space-x-1 text-emerald-700 font-bold font-sans text-[10.5px]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{tx.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. HOUSEHOLD FINANCIAL WALLETS */}
      {activeSubTab === 'WALLETS' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {computedHouseholds.map((h) => (
            <div key={h.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-extrabold text-slate-900">{h.name} ({h.type})</span>
                <span className="font-mono text-sm font-extrabold text-slate-900">₹{h.wallet.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                  <span className="text-emerald-700 font-medium">Money Earned</span>
                  <div className="font-mono font-bold text-emerald-900 text-sm mt-0.5">
                    +₹{h.moneyEarned.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2">
                  <span className="text-rose-700 font-medium">Money Spent</span>
                  <div className="font-mono font-bold text-rose-900 text-sm mt-0.5">
                    -₹{h.moneySpent.toFixed(2)}
                  </div>
                </div>
              </div>
              <span className="text-[9.5px] text-slate-400 font-mono block text-right">
                Initial: ₹{h.initialWallet.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 3. HOUSEHOLD ENERGY LEDGER */}
      {activeSubTab === 'ENERGY_LEDGER' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {computedHouseholds.map((h) => (
            <div key={h.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-extrabold text-slate-900">{h.name}</span>
                <span className={`font-mono font-bold ${h.netEnergy >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  Net: {h.netEnergy >= 0 ? `+${h.netEnergy.toFixed(1)}` : h.netEnergy.toFixed(1)} kW
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Generation:</span>
                  <span className="font-mono font-bold">{h.generation.toFixed(1)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consumption:</span>
                  <span className="font-mono font-bold">{h.consumption.toFixed(1)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-medium">Energy Sold:</span>
                  <span className="font-mono font-bold text-emerald-800">{h.soldKwh.toFixed(1)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 font-medium">Energy Bought:</span>
                  <span className="font-mono font-bold text-blue-800">{h.boughtKwh.toFixed(1)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700 font-medium">Energy Stored:</span>
                  <span className="font-mono font-bold text-teal-800">{h.storedKwh.toFixed(1)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700 font-medium">Grid Exported:</span>
                  <span className="font-mono font-bold text-slate-900">{h.exportedKwh.toFixed(1)} kWh</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. BATTERY OWNERSHIP & PROPORTIONAL CREDITS */}
      {activeSubTab === 'OWNERSHIP' && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-teal-200">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-teal-700" />
              <span className="font-bold text-slate-900">Community Battery Shared Ownership Ledger</span>
            </div>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-teal-800">
              90% Round-Trip Efficiency Accounting
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {computedHouseholds.map((h) => {
              const usableCredit = Math.round(h.storedKwh * 0.9 * 100) / 100;
              return (
                <div key={h.id} className="rounded-xl bg-white border border-teal-200/80 p-3 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{h.name}</span>
                    <span className="font-mono text-teal-800">{h.storedKwh.toFixed(1)} kWh Contributed</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Usable Withdrawal Credit:</span>
                    <span className="font-mono font-bold text-emerald-700">{usableCredit.toFixed(2)} kWh</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500">
            Prosumers earn proportional withdrawal rights based on verified stored energy, preventing unfair depletion.
          </p>
        </div>
      )}
    </div>
  );
}
