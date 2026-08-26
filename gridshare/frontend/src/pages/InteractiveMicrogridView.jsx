import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  INITIAL_DEMO_STATE,
  computeHouseholdStates,
  validateSellOrder,
  validatePurchaseOrder,
} from '../services/marketEngine';
import MarketplaceScene3D, { MARKET_3D_POSITIONS } from '../components/energy-map-3d/MarketplaceScene3D';
import CompactSellCard from '../components/marketplace/CompactSellCard';
import CommunityHouseholdInput from '../components/marketplace/CommunityHouseholdInput';
import MarketplaceOrdersPanel from '../components/marketplace/MarketplaceOrdersPanel';
import TradeConfirmationModal from '../components/marketplace/TradeConfirmationModal';
import TransactionLedger from '../components/marketplace/TransactionLedger';
import { api } from '../services/api';
import {
  Zap,
  Sparkles,
  RotateCcw,
  Camera,
  Play,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  TrendingUp,
  BatteryCharging,
  Maximize2,
  Minimize2,
  Info,
  ShoppingBag
} from 'lucide-react';

export default function InteractiveMicrogridView() {
  // Master Simulation State
  const [households, setHouseholds] = useState(INITIAL_DEMO_STATE.households);
  const [battery, setBattery] = useState(INITIAL_DEMO_STATE.battery);
  const [grid, setGrid] = useState(INITIAL_DEMO_STATE.grid);
  const [orders, setOrders] = useState({
    sellOrders: [],
    buyOrders: [],
  });
  const [transactions, setTransactions] = useState([]);
  const [activePurchase, setActivePurchase] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [activeFlows, setActiveFlows] = useState([]);
  const [selectedNode, setSelectedNode] = useState('house_a');
  const [activeBuyerId, setActiveBuyerId] = useState('house_b');
  const [isInspectingNode, setIsInspectingNode] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [demoStepMessage, setDemoStepMessage] = useState('');

  const sceneRef = useRef();
  const demoTimersRef = useRef([]);

  const clearDemoTimers = () => {
    demoTimersRef.current.forEach((t) => clearTimeout(t));
    demoTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearDemoTimers();
  }, []);

  // Compute live household states
  const computedHouseholds = useMemo(() => {
    return computeHouseholdStates(households, orders.sellOrders, orders.buyOrders, transactions);
  }, [households, orders, transactions]);

  // Total community metrics
  const totalGen = computedHouseholds.reduce((acc, h) => acc + h.generation, 0);
  const totalCon = computedHouseholds.reduce((acc, h) => acc + h.consumption, 0);
  const netCommunity = Math.round((totalGen - totalCon) * 100) / 100;

  // 1. Seller creates Sell Order (lists available energy in public marketplace)
  const handleCreateSellListing = (orderData) => {
    const newSellOrder = {
      id: `GS-SELL-${String(orders.sellOrders.length + 1).padStart(3, '0')}`,
      household_id: orderData.household_id,
      energy_kwh: orderData.energy_kwh,
      min_price_per_kwh: orderData.min_price_per_kwh,
      remaining_kwh: orderData.energy_kwh,
      status: 'OPEN',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedSells = [newSellOrder, ...orders.sellOrders];
    setOrders((prev) => ({ ...prev, sellOrders: updatedSells }));
    setDemoStepMessage(`✅ Listed ${newSellOrder.id}: ${orderData.household_id.toUpperCase()} listed ${orderData.energy_kwh} kWh @ ₹${orderData.min_price_per_kwh}/kWh in the Marketplace.`);

    // Sync backend
    api.createOffer({
      household_id: orderData.household_id,
      energy_kwh: orderData.energy_kwh,
      min_price_per_kwh: orderData.min_price_per_kwh,
    }).catch(() => {});
  };

  // 2. Buyer initiates manual purchase by clicking [PURCHASE]
  const handleInitiatePurchase = ({ buyerId, sellOrder, quantityKwh }) => {
    const errors = validatePurchaseOrder({ buyerId, sellOrder, quantityKwh }, computedHouseholds);
    if (errors) {
      const msg = Object.values(errors).join(', ');
      setDemoStepMessage(`⚠️ Cannot purchase: ${msg}`);
      return;
    }

    setActivePurchase({
      buyerId,
      sellOrder,
      quantityKwh: Number(quantityKwh) || sellOrder.remaining_kwh,
    });
    setIsConfirmModalOpen(true);
  };

  // 3. Cancel Sell Listing
  const handleCancelListing = (orderId) => {
    setOrders((prev) => ({
      ...prev,
      sellOrders: prev.sellOrders.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o)),
    }));
    setActivePurchase(null);
    setIsConfirmModalOpen(false);
    setDemoStepMessage(`Listing ${orderId} cancelled.`);
  };

  // 4. Confirm Energy Purchase (Simulated Payment + Virtual Energy Transfer + 3D Animation)
  const handleConfirmPurchase = async () => {
    if (!activePurchase) return;
    setIsSettling(true);

    const { buyerId, sellOrder, quantityKwh } = activePurchase;
    const sellerId = sellOrder.household_id;
    const unitPrice = sellOrder.min_price_per_kwh;
    const qty = Number(quantityKwh) || sellOrder.remaining_kwh;
    const totalAmount = Math.round(qty * unitPrice * 100) / 100;

    // A. Update Wallets & Energy Accounting
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

    // B. Update Listing Status
    setOrders((prev) => {
      const updatedSells = prev.sellOrders.map((o) => {
        if (o.id === sellOrder.id) {
          const rem = Math.max(0, Math.round((o.remaining_kwh - qty) * 100) / 100);
          return {
            ...o,
            remaining_kwh: rem,
            status: rem <= 0.001 ? 'FILLED' : 'PARTIALLY_FILLED',
          };
        }
        return o;
      });
      return { ...prev, sellOrders: updatedSells };
    });

    // C. Record Transaction in Settlement Ledger
    const newTx = {
      id: `TX-GS-${String(transactions.length + 1).padStart(3, '0')}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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

    // D. Trigger 3D Energy & Payment Flows
    const sellerPos = MARKET_3D_POSITIONS[sellerId] || [0, 0, 0];
    const buyerPos = MARKET_3D_POSITIONS[buyerId] || [0, 0, 0];

    const energyFlow = {
      id: `flow-energy-${Date.now()}`,
      start: sellerPos,
      end: buyerPos,
      kw: qty,
      type: 'ENERGY',
      color: '#059669',
      label: `${qty.toFixed(1)} kWh P2P Trade`,
      isActive: true,
    };

    const moneyFlow = {
      id: `flow-money-${Date.now()}`,
      start: buyerPos,
      end: sellerPos,
      amountInr: totalAmount,
      type: 'MONEY',
      color: '#eab308',
      label: `₹${totalAmount.toFixed(2)}`,
      isActive: true,
    };

    setActiveFlows([energyFlow, moneyFlow]);
    setDemoStepMessage(`🎉 Trade ${newTx.id} SETTLED! ${buyerId.toUpperCase()} bought ${qty.toFixed(1)} kWh from ${sellerId.toUpperCase()} for ₹${totalAmount.toFixed(2)}.`);

    setIsSettling(false);
    setIsConfirmModalOpen(false);
    setActivePurchase(null);

    setTimeout(() => {
      setActiveFlows((prev) => prev.filter((f) => f.type !== 'MONEY'));
    }, 6000);
  };

  // 5. Store Surplus in Community Battery
  const handleStoreSurplus = (householdId) => {
    const house = computedHouseholds.find((h) => h.id === householdId);
    if (!house || house.availableSurplus <= 0.05) return;

    const availableHeadroom = Math.max(0, battery.capacity - battery.storedKwh);
    const storeAmount = Math.min(house.availableSurplus, availableHeadroom, 1.2);

    if (storeAmount <= 0.001) return;

    const newStoredKwh = Math.round((battery.storedKwh + storeAmount) * 100) / 100;
    const newSoc = Math.min(100, Math.round((newStoredKwh / battery.capacity) * 100));

    setBattery((prev) => ({
      ...prev,
      storedKwh: newStoredKwh,
      soc: newSoc,
    }));

    setHouseholds((prev) =>
      prev.map((h) =>
        h.id === householdId
          ? { ...h, storedKwh: Math.round((h.storedKwh + storeAmount) * 100) / 100 }
          : h
      )
    );

    const housePos = MARKET_3D_POSITIONS[householdId];
    const battPos = MARKET_3D_POSITIONS['COMMUNITY_BATTERY'];

    const battFlow = {
      id: `flow-batt-${Date.now()}`,
      start: housePos,
      end: battPos,
      kw: storeAmount,
      type: 'ENERGY',
      color: '#0d9488',
      label: `Storage Buffer (+${storeAmount.toFixed(1)} kWh)`,
      isActive: true,
    };

    setActiveFlows((prev) => [...prev.filter((f) => f.label?.indexOf('Storage') === -1), battFlow]);
    setDemoStepMessage(`${house.name} stored +${storeAmount.toFixed(1)} kWh in Battery (SOC: ${newSoc}%).`);
  };

  // 6. Export Surplus to Utility Grid
  const handleExportSurplus = (householdId) => {
    const house = computedHouseholds.find((h) => h.id === householdId);
    if (!house || house.availableSurplus <= 0.05) return;

    const exportAmount = Math.round(house.availableSurplus * 100) / 100;
    const simulatedRevenue = Math.round(exportAmount * grid.exportPrice * 100) / 100;

    setHouseholds((prev) =>
      prev.map((h) =>
        h.id === householdId
          ? {
              ...h,
              exportedKwh: Math.round((h.exportedKwh + exportAmount) * 100) / 100,
              wallet: Math.round((h.wallet + simulatedRevenue) * 100) / 100,
              moneyEarned: Math.round((h.moneyEarned + simulatedRevenue) * 100) / 100,
            }
          : h
      )
    );

    const housePos = MARKET_3D_POSITIONS[householdId];
    const gridPos = MARKET_3D_POSITIONS['MAIN_UTILITY_GRID'];

    const gridFlow = {
      id: `flow-grid-${Date.now()}`,
      start: housePos,
      end: gridPos,
      kw: exportAmount,
      type: 'ENERGY',
      color: '#2563eb',
      label: `Grid Export (+${exportAmount.toFixed(1)} kWh)`,
      isActive: true,
    };

    setActiveFlows((prev) => [...prev.filter((f) => f.label?.indexOf('Grid') === -1), gridFlow]);
    setDemoStepMessage(`${house.name} exported ${exportAmount.toFixed(1)} kWh to Grid (+₹${simulatedRevenue.toFixed(2)}).`);
  };

  // 7. Load Default Preset
  const handleLoadDemo = () => {
    clearDemoTimers();
    setHouseholds(INITIAL_DEMO_STATE.households);
    setBattery(INITIAL_DEMO_STATE.battery);
    setGrid(INITIAL_DEMO_STATE.grid);
    setOrders({ sellOrders: [], buyOrders: [] });
    setActivePurchase(null);
    setIsConfirmModalOpen(false);
    setActiveFlows([]);
    setActiveBuyerId('house_b');
    setDemoStepMessage('Demo baseline loaded (House A +4.7 kW, House B -2.8 kW, House C +1.0 kW).');
  };

  // 8. Guided Hackathon Sequence
  const handleRunHackathonDemo = () => {
    handleLoadDemo();
    setDemoStepMessage('🚀 Step 1: House A lists 2.0 kWh @ ₹7.00/kWh in the Marketplace...');

    const t1 = setTimeout(() => {
      const order = {
        id: 'GS-SELL-001',
        household_id: 'house_a',
        energy_kwh: 2.0,
        min_price_per_kwh: 7.0,
        remaining_kwh: 2.0,
        status: 'OPEN',
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setOrders({ sellOrders: [order], buyOrders: [] });
      setActiveBuyerId('house_b');
      setDemoStepMessage('🛒 Step 2: Energy listed! House B browses the marketplace and clicks [PURCHASE]...');

      const t2 = setTimeout(() => {
        setActivePurchase({
          buyerId: 'house_b',
          sellOrder: order,
          quantityKwh: 2.0,
        });
        setIsConfirmModalOpen(true);
        setDemoStepMessage('📝 Step 3: Purchase confirmation open. Click [CONFIRM PURCHASE] to settle payment & start 3D energy transfer.');
      }, 1400);
      demoTimersRef.current.push(t2);
    }, 700);
    demoTimersRef.current.push(t1);
  };

  // 9. Reset Simulation
  const handleResetSimulation = () => {
    clearDemoTimers();
    setHouseholds(INITIAL_DEMO_STATE.households);
    setBattery(INITIAL_DEMO_STATE.battery);
    setGrid(INITIAL_DEMO_STATE.grid);
    setOrders({ sellOrders: [], buyOrders: [] });
    setTransactions([]);
    setActivePurchase(null);
    setIsConfirmModalOpen(false);
    setActiveFlows([]);
    setDemoStepMessage('Simulation reset to initial state.');
    if (sceneRef.current) sceneRef.current.resetCamera();
  };

  const activeBuyer = computedHouseholds.find((h) => h.id === activePurchase?.buyerId) || computedHouseholds[1];
  const activeSeller = computedHouseholds.find((h) => h.id === activePurchase?.sellOrder?.household_id) || computedHouseholds[0];
  const inspectedHousehold = computedHouseholds.find((h) => h.id === selectedNode) || computedHouseholds[0];

  return (
    <div className="space-y-2.5 max-w-[1680px] mx-auto pb-4">
      {/* 🌟 TOP COMPACT METRICS BAR */}
      <div className="flex flex-wrap items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs gap-2">
        <div className="flex items-center space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white shadow-2xs">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-black tracking-tight text-slate-900">
            Microgrid Digital Twin & P2P Market
          </span>
        </div>

        {/* Telemetry numbers */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <div className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 font-bold text-amber-900">
            Gen: {totalGen.toFixed(1)} kW
          </div>
          <div className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 font-bold text-blue-900">
            Load: {totalCon.toFixed(1)} kW
          </div>
          <div className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-900">
            Net: +{netCommunity.toFixed(1)} kW
          </div>
          <div className="rounded bg-teal-50 border border-teal-200 px-2 py-0.5 font-bold text-teal-900">
            ESS: {battery.soc}%
          </div>

          <div className="flex items-center space-x-1 ml-1">
            <button
              onClick={handleRunHackathonDemo}
              className="flex items-center space-x-1 rounded bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-0.8 text-[11px] font-bold shadow-2xs transition active:scale-95 border border-amber-600"
            >
              <Sparkles className="h-3 w-3" />
              <span>DEMO</span>
            </button>

            <button
              onClick={() => sceneRef.current?.resetCamera()}
              className="flex items-center space-x-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.8 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              title="Reset 3D Camera"
            >
              <Camera className="h-3 w-3 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Narrative Banner */}
      {demoStepMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50/95 px-3 py-1 text-[11.5px] text-emerald-950 shadow-2xs">
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">{demoStepMessage}</span>
          </div>
          <button onClick={() => setDemoStepMessage('')} className="text-emerald-700 hover:text-emerald-950 font-bold text-xs p-0.5">
            ✕
          </button>
        </div>
      )}

      {/* 🌟 3-COLUMN MAIN WORKSPACE (LEFT: 20-22%, CENTER 3D: 58-60%, RIGHT: 20%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* LEFT COLUMN: Compact Sell Form + Community Nodes (~22%) */}
        <div className="lg:col-span-3 space-y-2.5">
          {/* 1. Compact Sell Energy Card */}
          <CompactSellCard
            computedHouseholds={computedHouseholds}
            onCreateSellListing={handleCreateSellListing}
          />

          {/* 2. Compact Community Nodes */}
          <CommunityHouseholdInput
            computedHouseholds={computedHouseholds}
            battery={battery}
            grid={grid}
            onUpdateHousehold={(id, field, val) => {
              setHouseholds((prev) =>
                prev.map((h) => (h.id === id ? { ...h, [field]: Number(val) || 0 } : h))
              );
            }}
            onStoreSurplus={handleStoreSurplus}
            onExportSurplus={handleExportSurplus}
            onLoadDemo={handleLoadDemo}
            onResetSimulation={handleResetSimulation}
          />
        </div>

        {/* CENTER COLUMN: High-Priority 3D Virtual Microgrid (~58%) */}
        <div className="lg:col-span-6 xl:col-span-6">
          <div className="h-[540px] xl:h-[570px] w-full relative">
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
                setIsInspectingNode(true);
              }}
              isModalOpen={isConfirmModalOpen}
            />

            {/* Floating 3D status badge */}
            <div className="absolute top-2.5 left-2.5 pointer-events-none">
              <div className="flex items-center space-x-1.5 rounded-full border border-slate-200 bg-white/95 px-2.5 py-0.5 shadow-2xs backdrop-blur-md">
                <span className={`h-1.5 w-1.5 rounded-full ${activeFlows.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                <span className="text-[10px] font-bold text-slate-800">
                  {activeFlows.length > 0 ? 'Energy & Money Flows Active' : '3D Digital Twin • Click to Inspect'}
                </span>
              </div>
            </div>

            {/* Click-to-Inspect Card */}
            {isInspectingNode && inspectedHousehold && (
              <div className="absolute bottom-2.5 left-2.5 z-20 w-56 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur-md animate-in fade-in duration-150 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1">
                  <span className="font-extrabold text-[11px] text-slate-900">{inspectedHousehold.name} ({inspectedHousehold.type.split(' ')[0]})</span>
                  <button onClick={() => setIsInspectingNode(false)} className="text-slate-400 hover:text-slate-700 text-xs font-bold">
                    ✕
                  </button>
                </div>
                <div className="space-y-0.5 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gen / Load:</span>
                    <span className="font-mono font-bold">{inspectedHousehold.generation} / {inspectedHousehold.consumption} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Net:</span>
                    <span className={`font-mono font-bold ${inspectedHousehold.netEnergy >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {inspectedHousehold.netEnergy >= 0 ? `+${inspectedHousehold.netEnergy}` : inspectedHousehold.netEnergy} kW
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Wallet:</span>
                    <span className="font-mono font-bold">₹{inspectedHousehold.wallet.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Available Energy Marketplace & Purchase Orders (~20%) */}
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

      {/* 🌟 BOTTOM PANEL: Live Settlement Ledger */}
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
        }}
        isSettling={isSettling}
        buyerHousehold={activeBuyer}
        sellerHousehold={activeSeller}
      />
    </div>
  );
}
