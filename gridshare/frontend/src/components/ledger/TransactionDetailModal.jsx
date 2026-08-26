import React from 'react';
import {
  X,
  CheckCircle2,
  Zap,
  IndianRupee,
  ShieldCheck,
  Clock,
  ArrowRight,
  User,
  ShoppingBag,
  Building,
  Radio,
  BatteryCharging,
  Layers,
  Sparkles
} from 'lucide-react';
import StatusBadge from '../StatusBadge';

export default function TransactionDetailModal({
  transaction,
  onClose,
  gridTariff = 6.10,
}) {
  if (!transaction) return null;

  const isGridTx = transaction.type === 'GRID_IMPORT' || transaction.type === 'GRID_EXPORT';
  const isBatteryTx = transaction.type === 'BATTERY';
  const isP2P = !isGridTx && !isBatteryTx;

  const energyKwh = transaction.energy_kwh || transaction.energyKwh || 0;
  const pricePerKwh = transaction.price_per_kwh || transaction.pricePerKwh || 4.50;
  const totalValue = transaction.total_value || transaction.totalValue || (energyKwh * pricePerKwh);

  const sellerName = transaction.seller_household_id || transaction.sellerId || 'HOUSE_A';
  const buyerName = transaction.buyer_household_id || transaction.buyerId || 'HOUSE_B';

  const savingsVsGrid = isP2P ? energyKwh * Math.max(0, gridTariff - pricePerKwh) : 0;

  // 6-step lifecycle stages for P2P transactions
  const LIFECYCLE_STEPS = [
    { id: 1, title: 'Listed', desc: 'Surplus registered on P2P book', done: true },
    { id: 2, title: 'Buyer Selected', desc: 'Matched via continuous double-auction', done: true },
    { id: 3, title: 'Trade Confirmed', desc: 'Bilateral cryptographic handshake', done: true },
    { id: 4, title: 'Payment Settled', desc: `Virtual wallet debit: ₹${totalValue.toFixed(2)}`, done: true },
    { id: 5, title: 'Energy Transferred', desc: `Smart meter routed: ${energyKwh.toFixed(2)} kWh`, done: true },
    { id: 6, title: 'Settlement Complete', desc: 'Audit ledger entry confirmed', done: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-slate-400">
                #TXN-{transaction.id}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-800 border border-emerald-200">
                {transaction.type || 'P2P Bilateral Trade'}
              </span>
              <StatusBadge status={transaction.status || 'SETTLED'} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {sellerName} ➔ {buyerName}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Executed: {transaction.timestamp ? new Date(transaction.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '26 Aug 2026, 14:32'} • Transparent Digital Ledger
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Economics Strip */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Energy Volume</span>
            <div className="font-mono text-lg font-black text-slate-900 mt-0.5">
              {energyKwh.toFixed(2)} <span className="text-xs font-bold text-slate-500">kWh</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Clearing Tariff</span>
            <div className="font-mono text-lg font-black text-emerald-700 mt-0.5">
              ₹{pricePerKwh.toFixed(2)}<span className="text-xs font-bold text-slate-500">/kWh</span>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200">
            <span className="text-[11px] text-emerald-800 font-bold">Total Settled Value</span>
            <div className="font-mono text-lg font-black text-emerald-900 mt-0.5">
              ₹{totalValue.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Visual Energy Flow Diagram */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900 mb-3">
            <Zap className="h-4 w-4 text-blue-600" />
            <span>PHYSICAL ENERGY ROUTING PATH</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-xs w-full sm:w-auto flex-1">
              <span className="text-[10.5px] text-slate-400 block font-medium">Energy Origin</span>
              <span className="font-bold text-amber-700 block text-xs mt-0.5">☀ {sellerName} Solar Array</span>
              <span className="font-mono text-[11px] text-slate-600 mt-0.5 block">+{energyKwh.toFixed(2)} kWh</span>
            </div>

            <div className="flex items-center space-x-1 text-blue-600 font-bold font-mono text-xs px-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              <span>── {energyKwh.toFixed(2)} kWh ──►</span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-xs w-full sm:w-auto flex-1">
              <span className="text-[10.5px] text-slate-400 block font-medium">Energy Destination</span>
              <span className="font-bold text-blue-700 block text-xs mt-0.5">🏠 {buyerName} Load Circuit</span>
              <span className="font-mono text-[11px] text-slate-600 mt-0.5 block">-{energyKwh.toFixed(2)} kWh</span>
            </div>
          </div>
        </div>

        {/* Financial Payment Flow Diagram */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900 mb-3">
            <IndianRupee className="h-4 w-4 text-emerald-600" />
            <span>FINANCIAL SETTLEMENT & WALLET BALANCES</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-xs">
              <div className="flex justify-between items-center text-slate-500 text-[11px] mb-1">
                <span>Consumer Buyer ({buyerName}):</span>
                <span className="font-bold text-rose-600">DEBIT -₹{totalValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center font-mono text-slate-800 text-xs">
                <span>P2P Green Tariff:</span>
                <span className="font-bold">₹{pricePerKwh.toFixed(2)}/kWh</span>
              </div>
              {savingsVsGrid > 0 && (
                <div className="flex justify-between items-center text-emerald-700 text-[10.5px] font-bold mt-1 pt-1 border-t border-slate-100">
                  <span>Consumer P2P Savings vs Grid:</span>
                  <span>+₹{savingsVsGrid.toFixed(2)} saved</span>
                </div>
              )}
            </div>

            <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-xs">
              <div className="flex justify-between items-center text-slate-500 text-[11px] mb-1">
                <span>Prosumer Seller ({sellerName}):</span>
                <span className="font-bold text-emerald-600">CREDIT +₹{totalValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center font-mono text-slate-800 text-xs">
                <span>Net Export Tariff:</span>
                <span className="font-bold">₹{pricePerKwh.toFixed(2)}/kWh</span>
              </div>
              <div className="flex justify-between items-center text-emerald-700 text-[10.5px] font-bold mt-1 pt-1 border-t border-slate-100">
                <span>Settlement Status:</span>
                <span>✓ 100% Cleared</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6-Step Transaction Lifecycle */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center space-x-1.5">
            <Layers className="h-4 w-4 text-purple-600" />
            <span>Transaction Verification Lifecycle</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {LIFECYCLE_STEPS.map((step) => (
              <div
                key={step.id}
                className="flex items-start space-x-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 text-[11px] block">{step.title}</span>
                  <span className="text-[10px] text-slate-500 leading-tight block">{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Cryptographically signed by GridShare Local Consensus Engine</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 font-bold text-xs text-white hover:bg-slate-800 transition shadow-xs"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  );
}
