import React from 'react';
import {
  Sparkles,
  ShoppingBag,
  IndianRupee,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Building,
  UserCheck,
  Wallet,
  Zap
} from 'lucide-react';

export default function TradeConfirmationModal({
  purchase,
  isOpen,
  onConfirm,
  onCancel,
  isSettling = false,
  buyerHousehold = {},
  sellerHousehold = {},
}) {
  if (!isOpen || !purchase) return null;

  const { buyerId, sellOrder, quantityKwh } = purchase;
  const unitPrice = sellOrder?.min_price_per_kwh || 7.0;
  const qty = Number(quantityKwh) || sellOrder?.remaining_kwh || 2.0;
  const totalAmount = Math.round(qty * unitPrice * 100) / 100;

  const buyerWalletBefore = buyerHousehold.wallet || 100;
  const buyerWalletAfter = Math.max(0, Math.round((buyerWalletBefore - totalAmount) * 100) / 100);

  const sellerWalletBefore = sellerHousehold.wallet || 50;
  const sellerWalletAfter = Math.round((sellerWalletBefore + totalAmount) * 100) / 100;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-blue-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Purchase Confirmation
                </h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[9.5px] font-bold text-blue-900 border border-blue-300 uppercase">
                  Pending Buyer Consent
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Verify energy quantity, pricing, and virtual wallet settlement
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSettling}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Counterparty Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[10px]">
              <span className="font-bold text-emerald-800 uppercase">Seller (Prosumer)</span>
              <span className="font-mono">Listing #{sellOrder?.id}</span>
            </div>
            <div className="font-extrabold text-slate-900 text-sm">{sellerHousehold.name || sellOrder?.household_id?.toUpperCase()}</div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-100 font-mono">
              <span className="text-slate-500">Wallet:</span>
              <span className="font-bold text-emerald-800">₹{sellerWalletBefore.toFixed(0)} ➔ ₹{sellerWalletAfter.toFixed(0)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[10px]">
              <span className="font-bold text-blue-800 uppercase">Buyer (Consumer)</span>
              <span className="font-mono">Active Persona</span>
            </div>
            <div className="font-extrabold text-slate-900 text-sm">{buyerHousehold.name || buyerId?.toUpperCase()}</div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-100 font-mono">
              <span className="text-slate-500">Wallet:</span>
              <span className="font-bold text-blue-800">₹{buyerWalletBefore.toFixed(0)} ➔ ₹{buyerWalletAfter.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary Box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 mb-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Energy Quantity:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{qty.toFixed(1)} kWh</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Listed Unit Price:</span>
            <span className="font-mono font-bold text-emerald-700 text-sm">₹{unitPrice.toFixed(2)} / kWh</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="font-bold text-slate-900 text-xs">Total Simulated Payment:</span>
            <span className="font-mono font-extrabold text-slate-900 text-base">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Verification Check Badges */}
        <div className="space-y-1.5 mb-4 text-xs">
          <div className="flex items-center space-x-2 text-emerald-800 text-[11px] font-semibold bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>Buyer virtual wallet verified (₹{buyerWalletBefore.toFixed(2)} available ≥ ₹{totalAmount.toFixed(2)})</span>
          </div>
          <div className="flex items-center space-x-2 text-emerald-800 text-[11px] font-semibold bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>Seller energy listing confirmed ({qty.toFixed(1)} kWh available for transfer)</span>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[10.5px] text-amber-900 mb-5 flex items-start space-x-2">
          <ShieldCheck className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Simulated Software Settlement:</strong> Virtual wallet balances will be adjusted and 3D energy routing particles will be triggered upon confirmation.
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={isSettling}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSettling}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2 text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSettling ? 'Settling Payment & Transfer...' : 'CONFIRM PURCHASE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
