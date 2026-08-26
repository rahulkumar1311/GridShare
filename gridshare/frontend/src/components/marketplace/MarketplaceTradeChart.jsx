import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { TrendingUp, ShoppingBag, Zap, IndianRupee } from 'lucide-react';

export default function MarketplaceTradeChart({ transactions = [] }) {
  // Aggregate transactions by time / chronological index
  const chartData = transactions.length > 0
    ? transactions.map((t, idx) => ({
        tradeId: t.id || `TXN-${idx + 1}`,
        time: t.time || `${10 + idx}:00`,
        volumeKwh: t.energyKwh || 0,
        valueInr: t.totalValue || 0,
        counterparties: `${t.sellerId} ➔ ${t.buyerId}`,
      }))
    : [
        { tradeId: 'TXN-001', time: '08:00', volumeKwh: 1.5, valueInr: 10.5, counterparties: 'HOUSE_A ➔ HOUSE_B' },
        { tradeId: 'TXN-002', time: '10:00', volumeKwh: 2.0, valueInr: 14.0, counterparties: 'HOUSE_A ➔ HOUSE_B' },
        { tradeId: 'TXN-003', time: '12:00', volumeKwh: 3.5, valueInr: 24.5, counterparties: 'HOUSE_C ➔ HOUSE_B' },
        { tradeId: 'TXN-004', time: '14:00', volumeKwh: 2.2, valueInr: 15.4, counterparties: 'HOUSE_A ➔ HOUSE_C' },
      ];

  const totalVol = chartData.reduce((sum, d) => sum + d.volumeKwh, 0);
  const totalVal = chartData.reduce((sum, d) => sum + d.valueInr, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-600 text-white shadow-2xs">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              P2P Energy Trading History & Market Clearance
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Live settlement volumes & trade clearance curve
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <span className="rounded bg-purple-50 border border-purple-200 px-2 py-0.5 font-bold text-purple-900">
            Total Traded: {totalVol.toFixed(1)} kWh
          </span>
          <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-900">
            Total Value: ₹{totalVal.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="h-44 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTradeVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} unit=" kWh" />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.5rem', fontSize: '11px' }}
              formatter={(val, name, item) => [
                `${val} kWh (₹${item.payload.valueInr})`,
                `Volume (${item.payload.counterparties})`
              ]}
            />
            <Area
              type="monotone"
              dataKey="volumeKwh"
              name="Settled P2P Volume"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorTradeVol)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
