import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  INITIAL_DEMO_STATE,
  computeHouseholdStates,
  validateSellOrder,
  validatePurchaseOrder,
} from '../services/marketEngine';
import MarketplaceScene3D, { MARKET_3D_POSITIONS } from '../components/energy-map-3d/MarketplaceScene3D';
import CompactSellCard from '../components/marketplace/CompactSellCard';
import MarketplaceOrdersPanel from '../components/marketplace/MarketplaceOrdersPanel';
import TradeConfirmationModal from '../components/marketplace/TradeConfirmationModal';
import TransactionLedger from '../components/marketplace/TransactionLedger';
import MarketplaceTradeChart from '../components/marketplace/MarketplaceTradeChart';
import {
  ShoppingBag,
  Zap,
  IndianRupee,
  Sparkles,
  RotateCcw,
  Camera,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Building,
  Tag,
  ArrowRight,
  ShieldCheck,
  Layers,
  BarChart3
} from 'lucide-react';

export default function MarketplaceView() {
  // Master P2P Trading State
  const [households, setHouseholds] = useState(INITIAL_DEMO_STATE.households);
  const [battery, setBattery] = useState(INITIAL_DEMO_STATE.battery);
  const [grid, setGrid] = useState(INITIAL_DEMO_STATE.grid);

  const [orders, setOrders] = useState({
    sellOrders: [
      { id: 'GS-SELL-001', household_id: 'house_a', energy_kwh: 2.0, min_price_per_kwh: 7.0, remaining_kwh: 2.0, status: 'OPEN', created_at: '10:15' },
      { id: 'GS-SELL-002', household_id: 'house_c', energy_kwh: 1.0, min_price_per_kwh: 6.5, remaining_kwh: 1.0, status: 'OPEN', created_at: '10:20' },
    ],
    buyOrders: [],
  });

  const [transactions, setTransactions] = useState([
    { id: 'TXN-001', time: '10:00', sellerId: 'HOUSE_A', buyerId: 'HOUSE_B', energyKwh: 2.0, pricePerKwh: 7.0, totalValue: 14.0, paymentStatus: 'SETTLED', energyFlowStatus: 'TRANSFERRED', status: 'COMPLETED' },
    { id: 'TXN-002', time: '10:30', sellerId: 'HOUSE_C', buyerId: 'HOUSE_B', energyKwh: 1.2, pricePerKwh: 6.5, totalValue: 7.8, paymentStatus: 'SETTLED', energyFlowStatus: 'TRANSFERRED', status: 'COMPLETED' },
  ]);

  const [activeBuyerId, setActiveBuyerId] = useState('house_b');
  const [selectedNode, setSelectedNode] = useState('house_a');
  const [activeFlows, setActiveFlows] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [tradeStep, setTradeStep] = useState(0); // 0: Idle, 1: Selected, 2: Confirmed, 3: Settled, 4: Transferred, 5: Completed

  // Purchase Modal State
  const [activePurchase, setActivePurchase] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const sceneRef = useRef();

  // Compute live household balances & wallets
  const computedHouseholds = useMemo(() => {
    return computeHouseholdStates(households, orders.sellOrders, orders.buyOrders, transactions);
  }, [households, orders, transactions]);

  // Market KPIs Calculation
  const openSellOrders = (orders.sellOrders || []).filter(
    (o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED' || o.status === 'AVAILABLE'
  );
  const totalAvailableEnergy = openSellOrders.reduce((sum, o) => sum + (o.remaining_kwh || 0), 0);
  const totalEnergyTraded = transactions.reduce((sum, t) => sum + (t.energyKwh || 0), 0);
  const totalTradeValue = transactions.reduce((sum, t) => sum + (t.totalValue || 0), 0);

  const prices = openSellOrders.map((o) => o.min_price_per_kwh);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 6.0;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : 7.0;
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 6.75;

  // 1. Seller lists energy
  const handleCreateSellListing = ({ householdId, energyKwh, pricePerKwh }) => {
    const errors = validateSellOrder({ householdId, energyKwh, pricePerKwh }, computedHouseholds);
    if (errors) {
      setStatusMessage(`⚠️ Cannot list energy: ${Object.values(errors).join(', ')}`);
      return;
    }

    const newOrder = {
      id: `GS-SELL-${String(orders.sellOrders.length + 1).padStart(3, '0')}`,
      household_id: householdId,
      energy_kwh: Number(energyKwh),
      min_price_per_kwh: Number(pricePerKwh),
      remaining_kwh: Number(energyKwh),
      status: 'OPEN',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setOrders((prev) => ({
      ...prev,
      sellOrders: [newOrder, ...prev.sellOrders],
    }));

    setStatusMessage(`✅ Order ${newOrder.id} Created: ${householdId.toUpperCase()} listed ${energyKwh} kWh @ ₹${Number(pricePerKwh).toFixed(2)}/kWh.`);
    setSelectedNode(householdId);
  };

  // 2. Cancel an open listing
  const handleCancelListing = (orderId) => {
    setOrders((prev) => ({
      ...prev,
      sellOrders: prev.sellOrders.map((o) =>
        o.id === orderId ? { ...o, status: 'CANCELLED', remaining_kwh: 0 } : o
      ),
    }));
    setStatusMessage(`Order ${orderId} has been cancelled. Reserved energy returned to seller.`);
  };

  // 3. Initiate purchase from Marketplace
  const handleInitiatePurchase = ({ buyerId, sellOrder, quantityKwh }) => {
    const errors = validatePurchaseOrder({ buyerId, sellOrder, quantityKwh }, computedHouseholds);
    if (errors) {
      setStatusMessage(`⚠️ Cannot purchase: ${Object.values(errors).join(', ')}`);
      return;
    }

    setActivePurchase({
      buyerId,
      sellOrder,
      quantityKwh: Number(quantityKwh) || sellOrder.remaining_kwh,
    });
    setTradeStep(1); // 1. Order Selected
    setIsConfirmModalOpen(true);
  };

  // 4. Confirm purchase settlement & 3D transfer
  const handleConfirmPurchase = async () => {
    if (!activePurchase) return;
    setIsSettling(true);
    setTradeStep(2); // 2. Buyer Confirmed

    const { buyerId, sellOrder, quantityKwh } = activePurchase;
    const sellerId = sellOrder.household_id;
    const unitPrice = sellOrder.min_price_per_kwh;
    const qty = Number(quantityKwh) || sellOrder.remaining_kwh;
    const totalAmount = Math.round(qty * unitPrice * 100) / 100;

    // Settle wallets & energy balances
    setHouseholds((prev) =>
      prev.map((h) => {
        if (h.id === sellerId) {
          return {
            ...h,
            wallet: Math.round((h.wallet + totalAmount) * 100) / 100,
            moneyEarned: Math.round((h.moneyEarned + totalAmount) * 100) / 100,
            soldKwh: Math.round((h.soldKwh + qty) * 100) / 100,
          };
        }
        if (h.id === buyerId) {
          return {
            ...h,
            wallet: Math.round((h.wallet - totalAmount) * 100) / 100,
            moneySpent: Math.round((h.moneySpent + totalAmount) * 100) / 100,
            boughtKwh: Math.round((h.boughtKwh + qty) * 100) / 100,
          };
        }
        return h;
      })
    );

    // Update order status
    setOrders((prev) => {
      const updated = prev.sellOrders.map((o) => {
        if (o.id === sellOrder.id) {
          const remaining = Math.max(0, Math.round((o.remaining_kwh - qty) * 100) / 100);
          return {
            ...o,
            remaining_kwh: remaining,
            status: remaining <= 0.001 ? 'COMPLETED' : 'PARTIALLY_FILLED',
          };
        }
        return o;
      });
      return { ...prev, sellOrders: updated };
    });

    // Create new transaction
    const newTxId = `TXN-${String(transactions.length + 1).padStart(3, '0')}`;
    const newTx = {
      id: newTxId,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sellerId: sellerId.toUpperCase(),
      buyerId: buyerId.toUpperCase(),
      energyKwh: qty,
      pricePerKwh: unitPrice,
      totalValue: totalAmount,
      paymentStatus: 'SETTLED',
      energyFlowStatus: 'TRANSFERRED',
      status: 'COMPLETED',
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Animate 3D Energy & Money Particles
    const sellerPos = MARKET_3D_POSITIONS[sellerId] || [-4.2, 0, 1.2];
    const buyerPos = MARKET_3D_POSITIONS[buyerId] || [0.2, 0, 2.2];

    const energyFlow = {
      id: `flow-p2p-${Date.now()}`,
      start: sellerPos,
      end: buyerPos,
      kw: qty,
      type: 'ENERGY',
      color: '#059669',
      label: `P2P Transfer: ${qty.toFixed(1)} kWh`,
      isActive: true,
    };

    const moneyFlow = {
      id: `flow-money-${Date.now()}`,
      start: buyerPos,
      end: sellerPos,
      amountInr: totalAmount,
      type: 'MONEY',
      color: '#d97706',
      label: `Payment: ₹${totalAmount.toFixed(2)}`,
      isActive: true,
    };

    setActiveFlows([energyFlow, moneyFlow]);
    setTradeStep(3); // 3. Payment Settled

    setTimeout(() => {
      setTradeStep(4); // 4. Energy Transferred
      setTimeout(() => {
        setTradeStep(5); // 5. Trade Completed
        setStatusMessage(`🎉 Trade ${newTxId} Completed! ${buyerId.toUpperCase()} bought ${qty} kWh from ${sellerId.toUpperCase()} for ₹${totalAmount.toFixed(2)}.`);
      }, 700);
    }, 700);

    setIsSettling(false);
    setIsConfirmModalOpen(false);
    setActivePurchase(null);
  };

  // 5. Load Demo Market State
  const handleLoadDemoMarket = () => {
    setHouseholds([
      { id: 'house_a', name: 'House A', type: 'Solar Prosumer', generation: 6.8, consumption: 2.1, wallet: 64, soldKwh: 2.0, boughtKwh: 0, moneyEarned: 14, moneySpent: 0, hasSolar: true },
      { id: 'house_b', name: 'House B', type: 'EV Consumer', generation: 1.2, consumption: 4.0, wallet: 50, soldKwh: 0, boughtKwh: 0, moneyEarned: 0, moneySpent: 0, hasSolar: false },
      { id: 'house_c', name: 'House C', type: 'Prosumer Villa', generation: 3.5, consumption: 2.2, wallet: 75, soldKwh: 1.0, boughtKwh: 0, moneyEarned: 6.5, moneySpent: 0, hasSolar: true },
    ]);
    setOrders({
      sellOrders: [
        { id: 'GS-SELL-001', household_id: 'house_a', energy_kwh: 2.0, min_price_per_kwh: 7.0, remaining_kwh: 2.0, status: 'OPEN', created_at: '10:15' },
        { id: 'GS-SELL-002', household_id: 'house_c', energy_kwh: 1.0, min_price_per_kwh: 6.5, remaining_kwh: 1.0, status: 'OPEN', created_at: '10:20' },
      ],
      buyOrders: [],
    });
    setActiveBuyerId('house_b');
    setSelectedNode('house_a');
    setTradeStep(0);
    setActiveFlows([]);
    setStatusMessage('Demo Market Loaded: House A listed 2.0 kWh @ ₹7.0, House C listed 1.0 kWh @ ₹6.5. Select House B to purchase.');
  };

  // 6. Reset Market
  const handleResetMarket = () => {
    setHouseholds(INITIAL_DEMO_STATE.households);
    setBattery(INITIAL_DEMO_STATE.battery);
    setGrid(INITIAL_DEMO_STATE.grid);
    setOrders({ sellOrders: [], buyOrders: [] });
    setTransactions([]);
    setActiveFlows([]);
    setTradeStep(0);
    setStatusMessage('Marketplace state reset to initial zero baseline.');
    if (sceneRef.current) sceneRef.current.resetCamera();
  };

  const selectedHousehold = computedHouseholds.find((h) => h.id === selectedNode) || computedHouseholds[0];
  const activeBuyer = computedHouseholds.find((h) => h.id === activePurchase?.buyerId) || computedHouseholds[1];
  const activeSeller = computedHouseholds.find((h) => h.id === activePurchase?.sellOrder?.household_id) || computedHouseholds[0];

  return (
    <div className="space-y-2.5 max-w-[1680px] mx-auto pb-6 select-none">
      {/* 🌟 1. SECOND ROW: MARKETPLACE KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Active Sell Orders */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-blue-800 font-bold uppercase">
            <span>Active Orders</span>
            <ShoppingBag className="h-3 w-3 text-blue-600" />
          </div>
          <div className="font-mono font-extrabold text-blue-900 text-base mt-0.5">
            {openSellOrders.length} <span className="text-xs text-slate-500 font-sans font-normal">Listings</span>
          </div>
        </div>

        {/* Available Energy */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold uppercase">
            <span>Available Energy</span>
            <Zap className="h-3 w-3 text-emerald-600" />
          </div>
          <div className="font-mono font-extrabold text-emerald-900 text-base mt-0.5">
            {totalAvailableEnergy.toFixed(1)} <span className="text-xs text-slate-500 font-sans">kWh</span>
          </div>
        </div>

        {/* Today's Trades */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-purple-800 font-bold uppercase">
            <span>Trades Executed</span>
            <CheckCircle2 className="h-3 w-3 text-purple-600" />
          </div>
          <div className="font-mono font-extrabold text-purple-900 text-base mt-0.5">
            {transactions.length} <span className="text-xs text-slate-500 font-sans font-normal">Settled</span>
          </div>
        </div>

        {/* Energy Traded Volume */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-amber-800 font-bold uppercase">
            <span>Energy Traded</span>
            <TrendingUp className="h-3 w-3 text-amber-600" />
          </div>
          <div className="font-mono font-extrabold text-amber-900 text-base mt-0.5">
            {totalEnergyTraded.toFixed(1)} <span className="text-xs text-slate-500 font-sans">kWh</span>
          </div>
        </div>

        {/* Trade Value */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-teal-800 font-bold uppercase">
            <span>Trade Value</span>
            <IndianRupee className="h-3 w-3 text-teal-600" />
          </div>
          <div className="font-mono font-extrabold text-teal-900 text-base mt-0.5">
            ₹{totalTradeValue.toFixed(2)}
          </div>
        </div>

        {/* Market Price Range */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-slate-700 font-bold uppercase">
            <span>Price Spread</span>
            <Tag className="h-3 w-3 text-slate-500" />
          </div>
          <div className="font-mono font-extrabold text-slate-900 text-xs mt-1">
            ₹{lowestPrice.toFixed(1)} – ₹{highestPrice.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal font-sans">(Avg: ₹{avgPrice.toFixed(1)})</span>
          </div>
        </div>
      </div>

      {/* Dynamic Status / Narrative Banner */}
      {statusMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50/95 px-3 py-1 text-[11.5px] text-emerald-950 shadow-2xs">
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage('')} className="text-emerald-700 hover:text-emerald-950 font-bold text-xs p-0.5">
            ✕
          </button>
        </div>
      )}

      {/* 🌟 2. MAIN 3-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* LEFT COLUMN: Seller Panel & Wallet Summary (~22%) */}
        <div className="lg:col-span-3 space-y-2.5">
          {/* Sell Energy Form Card */}
          <CompactSellCard
            computedHouseholds={computedHouseholds}
            onCreateSellListing={handleCreateSellListing}
          />

          {/* Quick Demo Market Triggers */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleLoadDemoMarket}
              className="flex items-center justify-center space-x-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white py-1.5 text-[10.5px] font-bold shadow-2xs transition active:scale-95 border border-amber-600"
            >
              <Sparkles className="h-3 w-3" />
              <span>LOAD DEMO</span>
            </button>
            <button
              onClick={handleResetMarket}
              className="flex items-center justify-center space-x-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-1.5 text-[10.5px] font-semibold transition active:scale-95"
            >
              <RotateCcw className="h-3 w-3 text-slate-500" />
              <span>RESET</span>
            </button>
          </div>

          {/* Selected Household Wallet & Trading Profile */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="font-extrabold text-[11px] text-slate-900">
                {selectedHousehold.name} Wallet Profile
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-700">
                {selectedHousehold.type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10.5px] font-mono">
              <div className="rounded bg-slate-50 p-1.5">
                <span className="text-[9px] text-slate-500 uppercase block">Balance</span>
                <span className="font-extrabold text-slate-900 text-sm">₹{selectedHousehold.wallet?.toFixed(0) || 0}</span>
              </div>
              <div className="rounded bg-emerald-50/50 p-1.5 border border-emerald-100">
                <span className="text-[9px] text-emerald-800 uppercase block">Earned</span>
                <span className="font-extrabold text-emerald-800 text-sm">+₹{selectedHousehold.moneyEarned?.toFixed(0) || 0}</span>
              </div>
              <div className="rounded bg-blue-50/50 p-1.5 border border-blue-100">
                <span className="text-[9px] text-blue-800 uppercase block">Energy Sold</span>
                <span className="font-extrabold text-blue-900">{selectedHousehold.soldKwh?.toFixed(1) || 0} kWh</span>
              </div>
              <div className="rounded bg-purple-50/50 p-1.5 border border-purple-100">
                <span className="text-[9px] text-purple-800 uppercase block">Energy Bought</span>
                <span className="font-extrabold text-purple-900">{selectedHousehold.boughtKwh?.toFixed(1) || 0} kWh</span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: 3D P2P Energy Marketplace (~58%) */}
        <div className="lg:col-span-6 xl:col-span-6">
          <div className="flex flex-col h-full rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-card space-y-2">
            {/* 3D Header Bar & Camera Controls */}
            <div className="flex items-center justify-between px-1 text-xs">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-900">
                  3D Virtual P2P Marketplace Twin
                </span>
              </div>

              <div className="flex items-center space-x-1 text-[10px] font-semibold">
                <button
                  onClick={() => sceneRef.current?.resetCamera()}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.8 text-slate-700 hover:bg-slate-100 transition"
                  title="Default Perspective"
                >
                  <Camera className="h-3 w-3 inline mr-1 text-slate-500" />
                  Reset View
                </button>
                <button
                  onClick={() => sceneRef.current?.topView()}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.8 text-slate-700 hover:bg-slate-100 transition hidden sm:inline"
                  title="Top-Down Overhead Angle"
                >
                  Top View
                </button>
                <button
                  onClick={() => sceneRef.current?.marketView()}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.8 text-slate-700 hover:bg-slate-100 transition hidden sm:inline"
                  title="Market Arena Angle"
                >
                  Market View
                </button>
              </div>
            </div>

            {/* Live 3D Trade Execution Status Bar */}
            {tradeStep > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-purple-50/90 border border-purple-200 px-2.5 py-1 text-[10px] font-bold text-purple-950 animate-in fade-in duration-150">
                <span className="flex items-center space-x-1">
                  <Sparkles className="h-3 w-3 text-purple-600" />
                  <span>Trade Lifecycle:</span>
                </span>
                <div className="flex items-center space-x-2 text-[9.5px]">
                  <span className={tradeStep >= 1 ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}>1. Selected ✓</span>
                  <span className={tradeStep >= 2 ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}>2. Confirmed ✓</span>
                  <span className={tradeStep >= 3 ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}>3. Settled ✓</span>
                  <span className={tradeStep >= 4 ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}>4. Transfer ⚡</span>
                  <span className={tradeStep >= 5 ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}>5. Completed 🎉</span>
                </div>
              </div>
            )}

            {/* 3D Canvas */}
            <div className="h-[460px] xl:h-[490px] w-full relative rounded-xl overflow-hidden">
              <MarketplaceScene3D
                ref={sceneRef}
                households={computedHouseholds}
                battery={battery}
                grid={grid}
                orders={orders}
                activeFlows={activeFlows}
                isMatching={false}
                selectedNode={selectedNode}
                onSelectNode={(nodeId) => {
                  setSelectedNode(nodeId);
                  if (nodeId === 'house_b') setActiveBuyerId('house_b');
                }}
                isModalOpen={isConfirmModalOpen}
              />

              {/* Floating micro status badge */}
              <div className="absolute top-2.5 left-2.5 pointer-events-none">
                <div className="flex items-center space-x-1.5 rounded-full border border-slate-200 bg-white/95 px-2.5 py-0.5 shadow-2xs backdrop-blur-md">
                  <span className={`h-1.5 w-1.5 rounded-full ${activeFlows.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-purple-500'}`} />
                  <span className="text-[10px] font-bold text-slate-800">
                    {activeFlows.length > 0 ? 'P2P Transfer Active • 3D Spline Flow' : 'Interactive Market Arena • Click Node'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Available Orders & Buyer Panel (~20%) */}
        <div className="lg:col-span-3 xl:col-span-3">
          <MarketplaceOrdersPanel
            computedHouseholds={computedHouseholds}
            sellOrders={orders.sellOrders}
            onInitiatePurchase={handleInitiatePurchase}
            onCancelListing={handleCancelListing}
            activeBuyerId={activeBuyerId}
            onChangeActiveBuyer={setActiveBuyerId}
          />
        </div>
      </div>

      {/* 🌟 3. BOTTOM ROW: TRADE CHARTS & LIVE LEDGER */}
      <MarketplaceTradeChart transactions={transactions} />

      <TransactionLedger
        transactions={transactions}
        computedHouseholds={computedHouseholds}
        battery={battery}
      />

      {/* Purchase Confirmation Modal */}
      <TradeConfirmationModal
        purchase={activePurchase}
        isOpen={isConfirmModalOpen}
        onConfirm={handleConfirmPurchase}
        onCancel={() => {
          setIsConfirmModalOpen(false);
          setActivePurchase(null);
          setTradeStep(0);
        }}
        isSettling={isSettling}
        buyerHousehold={activeBuyer}
        sellerHousehold={activeSeller}
      />
    </div>
  );
}
