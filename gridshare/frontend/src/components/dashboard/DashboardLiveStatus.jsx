import React from 'react';
import {
  Zap,
  Tag,
  BatteryCharging,
  ArrowDownUp,
  ShoppingBag,
  IndianRupee,
  ShieldCheck,
  TrendingUp,
  PlusCircle,
  Play
} from 'lucide-react';

export default function DashboardLiveStatus({
  selectedHousehold = {},
  battery = {},
  grid = {},
  orders = { sellOrders: [], buyOrders: [] },
  transactions = [],
  onOpenSellModal,
  onStoreSurplus,
  onExportSurplus,
  onChargeBattery,
  onDischargeBattery,
  onGridImport,
  onInitiatePurchase,
  disabled = false,
}) {
  const isSurplus = (selectedHousehold.generation - selectedHousehold.consumption) > 0.001;
  const net = Math.round(((selectedHousehold.generation || 0) - (selectedHousehold.consumption || 0)) * 10) / 10;
  const availableSurplus = selectedHousehold.availableSurplus || Math.max(0, net);

  const openSellListings = (orders.sellOrders || []).filter((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED');
  const totalVolumeTraded = transactions.reduce((acc, t) => acc + (t.energyKwh || 0), 0);
  const totalTradeValue = transactions.reduce((acc, t) => acc + (t.totalValue || 0), 0);

  const storedKwh = (battery.soc / 100) * (battery.capacity || 20);
  const availableHeadroom = Math.max(0, (battery.capacity || 20) - storedKwh);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card space-y-3 select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <div className="flex items-center space-x-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-white shadow-2xs">
            <Zap className="h-3 w-3" />
          </div>
          <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-900">
            Control & Status
          </span>
        </div>
        <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-800 border border-blue-200">
          Node Actions
        </span>
      </div>

      {/* 1. SELECTED NODE DETAILS & SURPLUS ACTIONS */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-[11px] text-slate-900">
            Selected: {selectedHousehold.name || 'House A'}
          </span>
          <span
            className={`rounded px-1.5 py-0.2 text-[8.5px] font-bold font-mono uppercase ${
              isSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {isSurplus ? `+${net.toFixed(1)} kW Surplus` : `${net.toFixed(1)} kW Deficit`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 font-mono">
          <div>Gen: <strong className="text-slate-900">{selectedHousehold.generation?.toFixed(1) || 0} kW</strong></div>
          <div>Load: <strong className="text-slate-900">{selectedHousehold.consumption?.toFixed(1) || 0} kW</strong></div>
          <div>Wallet: <strong className="text-slate-900">₹{selectedHousehold.wallet?.toFixed(0) || 0}</strong></div>
          <div>Sold: <strong className="text-emerald-700">{selectedHousehold.soldKwh?.toFixed(1) || 0} kWh</strong></div>
        </div>

        {/* Action Buttons for Prosumer with Surplus */}
        {isSurplus && (
          <div className="pt-1.5 border-t border-slate-200/80 space-y-1">
            <span className="text-[9.5px] font-bold text-slate-700 block">
              Surplus Action ({availableSurplus.toFixed(1)} kWh Available):
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => onOpenSellModal(selectedHousehold.id)}
                disabled={disabled || availableSurplus <= 0.05}
                className="rounded bg-emerald-600 hover:bg-emerald-700 text-white py-1 text-[9.5px] font-bold shadow-2xs transition active:scale-95 disabled:opacity-40"
              >
                Sell P2P
              </button>
              <button
                onClick={() => onStoreSurplus(selectedHousehold.id)}
                disabled={disabled || availableSurplus <= 0.05 || battery.soc >= 98}
                className="rounded bg-teal-600 hover:bg-teal-700 text-white py-1 text-[9.5px] font-bold shadow-2xs transition active:scale-95 disabled:opacity-40"
              >
                Store ESS
              </button>
              <button
                onClick={() => onExportSurplus(selectedHousehold.id)}
                disabled={disabled || availableSurplus <= 0.05}
                className="rounded bg-blue-600 hover:bg-blue-700 text-white py-1 text-[9.5px] font-bold shadow-2xs transition active:scale-95 disabled:opacity-40"
              >
                Export
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. COMMUNITY BATTERY CHARGE & DISCHARGE */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-2 space-y-1.5">
        <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-900">
          <div className="flex items-center space-x-1">
            <BatteryCharging className="h-3 w-3 text-teal-600" />
            <span>Battery Control</span>
          </div>
          <span className="font-mono text-teal-900 font-bold">{battery.soc?.toFixed(0)}% ({storedKwh.toFixed(1)} / {battery.capacity || 20} kWh)</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            onClick={() => onChargeBattery(1.5)}
            disabled={disabled || battery.soc >= 98}
            className="rounded bg-teal-600 hover:bg-teal-700 text-white py-1 text-[10px] font-bold transition active:scale-95 disabled:opacity-40"
          >
            + Charge 1.5 kWh
          </button>
          <button
            onClick={() => onDischargeBattery(1.5)}
            disabled={disabled || battery.soc <= 20}
            className="rounded bg-slate-800 hover:bg-slate-900 text-white py-1 text-[10px] font-bold transition active:scale-95 disabled:opacity-40"
          >
            - Discharge 1.5 kWh
          </button>
        </div>
      </div>

      {/* 3. UTILITY GRID CONTROLS */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-1.5">
        <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-900">
          <div className="flex items-center space-x-1">
            <IndianRupee className="h-3 w-3 text-slate-600" />
            <span>Grid Interconnect</span>
          </div>
          <span className="font-mono text-slate-900 font-bold">₹{grid.exportPrice?.toFixed(1)}/kWh</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            onClick={() => onExportSurplus(selectedHousehold.id || 'house_a')}
            disabled={disabled}
            className="rounded bg-blue-600 hover:bg-blue-700 text-white py-1 text-[10px] font-bold transition active:scale-95"
          >
            Export Surplus
          </button>
          <button
            onClick={onGridImport}
            disabled={disabled}
            className="rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 py-1 text-[10px] font-bold transition active:scale-95"
          >
            Import Power
          </button>
        </div>
      </div>

      {/* 4. MARKETPLACE OVERVIEW & ACTIVE LISTINGS */}
      <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-2 space-y-1.5">
        <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-900">
          <div className="flex items-center space-x-1">
            <ShoppingBag className="h-3 w-3 text-purple-600" />
            <span>P2P Marketplace</span>
          </div>
          <span className="font-mono text-purple-900 font-bold">{openSellListings.length} Active Orders</span>
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>Traded: <strong className="text-slate-900">{totalVolumeTraded.toFixed(1)} kWh</strong></span>
          <span>Value: <strong className="text-purple-900 font-bold">₹{totalTradeValue.toFixed(1)}</strong></span>
        </div>

        {/* Quick purchase list if open orders exist */}
        {openSellListings.length > 0 && (
          <div className="pt-1 border-t border-purple-100 space-y-1">
            {openSellListings.slice(0, 2).map((ord) => (
              <div key={ord.id} className="flex items-center justify-between rounded bg-white border border-purple-200 p-1 text-[9.5px]">
                <div>
                  <span className="font-bold text-slate-900">{ord.household_id?.toUpperCase()}</span>
                  <span className="text-slate-500 font-mono ml-1">{ord.remaining_kwh} kWh @ ₹{ord.min_price_per_kwh}</span>
                </div>
                <button
                  onClick={() => onInitiatePurchase({ buyerId: 'house_b', sellOrder: ord, quantityKwh: ord.remaining_kwh })}
                  disabled={disabled}
                  className="rounded bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 font-bold transition active:scale-95"
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
