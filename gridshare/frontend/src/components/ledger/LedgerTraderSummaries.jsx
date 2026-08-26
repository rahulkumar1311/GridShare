import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Scale, IndianRupee, Zap, ShieldCheck } from 'lucide-react';

export default function LedgerTraderSummaries({
  sellerKwh = 14.2,
  sellerEarnings = 72.40,
  sellerAvgPrice = 5.10,
  buyerKwh = 10.4,
  buyerSpent = 52.80,
  buyerAvgPrice = 5.08,
  buyerSavings = 10.40,
}) {
  const netKwh = sellerKwh - buyerKwh;
  const netInr = sellerEarnings - buyerSpent;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Seller Summary Card */}
      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-white p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-amber-100 mb-3">
            <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-900 uppercase tracking-wider">
              <ArrowUpRight className="h-4 w-4 text-amber-600" />
              <span>Prosumer Seller Summary</span>
            </div>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              SOLAR EXPORT
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Total Energy Sold:</span>
              <span className="font-mono font-bold text-slate-800">{sellerKwh.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Total Sales Earnings:</span>
              <span className="font-mono font-bold text-emerald-700">₹{sellerEarnings.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Average Clearing Price:</span>
              <span className="font-mono font-bold text-slate-800">₹{sellerAvgPrice.toFixed(2)}/kWh</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Pending Settlements:</span>
              <span className="font-mono font-bold text-slate-400">₹0.00</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-900">
          <span>Net Settled Credits:</span>
          <span className="font-mono text-emerald-700 text-sm">₹{sellerEarnings.toFixed(2)}</span>
        </div>
      </div>

      {/* 2. Buyer Summary Card */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-white p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-blue-100 mb-3">
            <div className="flex items-center space-x-1.5 font-bold text-xs text-blue-900 uppercase tracking-wider">
              <ArrowDownLeft className="h-4 w-4 text-blue-600" />
              <span>Consumer Buyer Summary</span>
            </div>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              GREEN DEMAND
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Total Energy Bought:</span>
              <span className="font-mono font-bold text-slate-800">{buyerKwh.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Total P2P Spent:</span>
              <span className="font-mono font-bold text-slate-800">₹{buyerSpent.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Average Purchase Price:</span>
              <span className="font-mono font-bold text-slate-800">₹{buyerAvgPrice.toFixed(2)}/kWh</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Savings vs Grid Standard:</span>
              <span className="font-mono font-bold text-emerald-700">+₹{buyerSavings.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-blue-900">
          <span>Net Community Savings:</span>
          <span className="font-mono text-emerald-700 text-sm">+₹{buyerSavings.toFixed(2)}</span>
        </div>
      </div>

      {/* 3. Net Microgrid Energy Balance */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-800 uppercase tracking-wider">
              <Scale className="h-4 w-4 text-emerald-600" />
              <span>Net Community Ledger Balance</span>
            </div>
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
              BALANCED
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Net Energy Volume:</span>
              <span className="font-mono font-bold text-slate-900">{netKwh >= 0 ? `+${netKwh.toFixed(2)}` : netKwh.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Net Financial Inflow:</span>
              <span className="font-mono font-bold text-emerald-700">{netInr >= 0 ? `+₹${netInr.toFixed(2)}` : `-₹${Math.abs(netInr).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Clearing Efficiency:</span>
              <span className="font-mono font-bold text-slate-800">100.0%</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500">Settlement Verification:</span>
              <span className="font-mono font-bold text-emerald-700">Instant Automated</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
          <span>Net Microgrid Dividend:</span>
          <span className="font-mono text-emerald-700 text-sm">₹{(sellerEarnings - buyerSpent).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
