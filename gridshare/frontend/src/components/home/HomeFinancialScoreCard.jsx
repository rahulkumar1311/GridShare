import React from 'react';
import { IndianRupee, Award, CheckCircle2, TrendingUp, Sun, ShoppingBag, Radio } from 'lucide-react';

export default function HomeFinancialScoreCard({
  solarSavings = 112.24,
  p2pEarnings = 22.50,
  p2pPurchases = 0.00,
  gridCost = 12.20,
  gridExportEarnings = 3.50,
  energyScore = 84,
  scoreReasons = [
    'High rooftop solar self-consumption (82%)',
    'Low utility grid reliance during peak tariff hours',
    'Home battery emergency reserve strictly maintained (20%)',
    'Active participant in local peer microgrid energy sharing',
  ],
}) {
  const netFinancialBenefit = solarSavings + p2pEarnings + gridExportEarnings - (p2pPurchases + gridCost);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Today's Energy Financial Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
            <div className="flex items-center space-x-2">
              <IndianRupee className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Today's Energy Cost & Savings
              </h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold font-mono text-emerald-800 border border-emerald-200">
              Net Savings: +₹{netFinancialBenefit.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-600 flex items-center space-x-1.5">
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <span>Solar Self-Consumption Savings:</span>
              </span>
              <span className="font-mono font-bold text-emerald-700">+₹{solarSavings.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-600 flex items-center space-x-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-purple-500" />
                <span>P2P Marketplace Sales:</span>
              </span>
              <span className="font-mono font-bold text-emerald-700">+₹{p2pEarnings.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-600 flex items-center space-x-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-blue-500" />
                <span>P2P Green Purchases:</span>
              </span>
              <span className="font-mono font-bold text-slate-800">-₹{p2pPurchases.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-600 flex items-center space-x-1.5">
                <Radio className="h-3.5 w-3.5 text-slate-500" />
                <span>Utility Grid Import Cost:</span>
              </span>
              <span className="font-mono font-bold text-rose-600">-₹{gridCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-emerald-50/70 p-2.5 border border-emerald-200 flex items-center justify-between text-xs">
          <span className="font-bold text-emerald-900">Total Net Daily Benefit:</span>
          <span className="font-mono text-sm font-bold text-emerald-800">
            {netFinancialBenefit >= 0 ? `+₹${netFinancialBenefit.toFixed(2)}` : `-₹${Math.abs(netFinancialBenefit).toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Home Energy Score */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Home Energy Efficiency Score
              </h3>
            </div>
            <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
              OPTIMAL
            </span>
          </div>

          <div className="flex items-center space-x-4 mb-3">
            {/* Circular score badge */}
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-md">
              <div className="text-center">
                <span className="font-mono text-xl font-black leading-none block">{energyScore}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-80">/ 100</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-900">A+ Microgrid Efficiency Rating</div>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                Calculated in real-time from solar self-consumption, battery cycling efficiency, and grid independence.
              </p>
            </div>
          </div>

          {/* Checks list */}
          <div className="space-y-1 text-[11px] text-slate-700">
            {scoreReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
