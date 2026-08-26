import React from 'react';
import {
  Layers,
  Sparkles,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Clock,
  Zap,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

export default function P2POrderBook({
  sellOrders = [],
  buyOrders = [],
  onCancelSell,
  onCancelBuy,
  activeMatch = null,
  onReviewMatch,
}) {
  const openSells = sellOrders.filter((o) => o.status !== 'CANCELLED');
  const openBuys = buyOrders.filter((o) => o.status !== 'CANCELLED');

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-card space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <Layers className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Live P2P Energy Order Book
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600">
          {openSells.length} Sells • {openBuys.length} Buys
        </span>
      </div>

      {/* Smart Match Recommendation Alert Banner */}
      {activeMatch && (
        <div className="rounded-xl border border-purple-300 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-2.5 shadow-xs animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-white text-[9px] font-extrabold animate-pulse">
                ✓
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-purple-950">
                Compatible Match Found!
              </span>
            </div>
            <span className="rounded bg-purple-200/80 px-1.5 py-0.2 font-mono text-[9.5px] font-bold text-purple-900">
              Save ₹{activeMatch.buyerSavings?.toFixed(2)}
            </span>
          </div>

          <p className="text-[10.5px] text-purple-900 font-medium leading-tight mb-2">
            <strong>{activeMatch.sellerId?.toUpperCase()}</strong> offers {activeMatch.tradeQuantity} kWh @ ₹{activeMatch.clearingPrice}/kWh ➔ <strong>{activeMatch.buyerId?.toUpperCase()}</strong> bid max ₹{activeMatch.buyerMaxPrice}/kWh.
          </p>

          <button
            onClick={onReviewMatch}
            className="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white py-1.5 text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>REVIEW & CONFIRM TRADE</span>
          </button>
        </div>
      )}

      {/* Orders Grid (2 columns or split) */}
      <div className="space-y-3 text-xs">
        {/* SELL ORDERS */}
        <div>
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-700 mb-1">
            <span className="text-emerald-700 uppercase flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>Sell Asks (Prosumer Supply)</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">{openSells.length} Active</span>
          </div>

          {openSells.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center text-[11px] text-slate-400">
              No open sell orders. Prosumers can place a sell order above.
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-[10.5px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-1 px-2">Order</th>
                    <th className="py-1 px-1.5">Seller</th>
                    <th className="py-1 px-1.5">Energy</th>
                    <th className="py-1 px-1.5">Price</th>
                    <th className="py-1 px-1.5">Total</th>
                    <th className="py-1 px-1.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {openSells.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-1 px-2 font-bold text-slate-600">{order.id}</td>
                      <td className="py-1 px-1.5 font-sans font-bold text-slate-900">{order.household_id}</td>
                      <td className="py-1 px-1.5 text-emerald-700 font-bold">{order.remaining_kwh.toFixed(1)} kWh</td>
                      <td className="py-1 px-1.5 font-bold text-slate-800">₹{order.min_price_per_kwh.toFixed(1)}</td>
                      <td className="py-1 px-1.5 text-slate-600">₹{(order.remaining_kwh * order.min_price_per_kwh).toFixed(1)}</td>
                      <td className="py-1 px-1.5 text-right">
                        {order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED' ? (
                          <button
                            onClick={() => onCancelSell(order.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                            title="Cancel open sell order"
                          >
                            <Trash2 className="h-3 w-3 inline" />
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-600 uppercase font-sans">
                            {order.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* BUY ORDERS */}
        <div>
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-700 mb-1">
            <span className="text-blue-700 uppercase flex items-center space-x-1">
              <TrendingDown className="h-3 w-3" />
              <span>Buy Bids (Consumer Demand)</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">{openBuys.length} Active</span>
          </div>

          {openBuys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center text-[11px] text-slate-400">
              No open buy requests. Deficit consumers can place a buy order above.
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-[10.5px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-1 px-2">Order</th>
                    <th className="py-1 px-1.5">Buyer</th>
                    <th className="py-1 px-1.5">Energy</th>
                    <th className="py-1 px-1.5">Max Bid</th>
                    <th className="py-1 px-1.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {openBuys.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-1 px-2 font-bold text-slate-600">{order.id}</td>
                      <td className="py-1 px-1.5 font-sans font-bold text-slate-900">{order.household_id}</td>
                      <td className="py-1 px-1.5 text-blue-700 font-bold">{order.remaining_kwh.toFixed(1)} kWh</td>
                      <td className="py-1 px-1.5 font-bold text-slate-800">₹{order.max_price_per_kwh.toFixed(1)}</td>
                      <td className="py-1 px-1.5 text-right">
                        {order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED' ? (
                          <button
                            onClick={() => onCancelBuy(order.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                            title="Cancel open buy request"
                          >
                            <Trash2 className="h-3 w-3 inline" />
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-blue-600 uppercase font-sans">
                            {order.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
