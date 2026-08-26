import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import CommunityScene3D, { NODE_3D_POSITIONS } from '../components/energy-map-3d/CommunityScene3D';
import StatusBadge from '../components/StatusBadge';
import { LoadingState, ErrorState } from '../components/StateFeedback';
import {
  Sun,
  Home,
  BatteryCharging,
  Zap,
  RefreshCw,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  Power,
  RotateCcw,
  Play,
  Eye,
  Sparkles,
  Compass,
  X,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

export default function EnergyMapView() {
  const [observeData, setObserveData] = useState(null);
  const [trades, setTrades] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState('house_a');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Demo sequence runner states
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStage, setDemoStage] = useState(0); // 0 = idle, 1 = trade, 2 = store, 3 = export, 4 = full
  const [demoStatusText, setDemoStatusText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const sceneRef = useRef();
  const demoTimersRef = useRef([]);

  const clearAllDemoTimers = () => {
    demoTimersRef.current.forEach(t => clearTimeout(t));
    demoTimersRef.current = [];
  };

  const fetchMapTelemetry = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      setError(null);
      const [obsRes, tradeRes, decRes, predRes] = await Promise.all([
        api.getCommunityState(),
        api.getMarketTransactions(10),
        api.getLatestOptimization(10),
        api.getPredictions(),
      ]);

      if (obsRes.data?.status === 'SUCCESS') setObserveData(obsRes.data.data);
      if (tradeRes.data?.status === 'SUCCESS') setTrades(tradeRes.data.transactions || []);
      if (decRes.data?.status === 'SUCCESS') setDecisions(decRes.data.decisions || []);
      if (predRes.data?.status === 'SUCCESS') setPredictions(predRes.data.predictions || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load microgrid 3D topology.');
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    fetchMapTelemetry();
    const interval = setInterval(() => {
      if (!isDemoRunning) fetchMapTelemetry(false);
    }, 4000);
    return () => {
      clearInterval(interval);
      clearAllDemoTimers();
    };
  }, [isDemoRunning]);

  // Handle Interactive Demo Mode Execution
  const handleRunDemo = async () => {
    clearAllDemoTimers();
    try {
      setIsDemoRunning(true);
      setSelectedNode('house_a');

      // Phase 1 (Immediate, 0s): Local P2P Trade particles start running immediately
      setDemoStage(1);
      setDemoStatusText('⚡ Phase 1: Local P2P Trade — House A (+4.7 kW Surplus) routing 2.80 kW to House B (-2.8 kW Deficit) @ ₹4.50/kWh');

      // Execute deterministic demo backend scenario
      await api.runDemoScenario();
      await fetchMapTelemetry(false);

      // Phase 2 (4s): Battery Storage Injection
      const t1 = setTimeout(() => {
        setDemoStage(2);
        setDemoStatusText('🔋 Phase 2: Storage Buffering — 1.20 kW remaining solar surplus buffering Community Battery (40% SOC)');
      }, 4000);
      demoTimersRef.current.push(t1);

      // Phase 3 (8s): Grid Export
      const t2 = setTimeout(() => {
        setDemoStage(3);
        setDemoStatusText('🌐 Phase 3: Grid Feed-in — 0.70 kW residual exported to Utility Grid Substation @ ₹6.10/kWh');
      }, 8000);
      demoTimersRef.current.push(t2);

      // Phase 4 (13s): Full Equilibrium Balance
      const t3 = setTimeout(() => {
        setDemoStage(4);
        setDemoStatusText('✅ Microgrid Fully Balanced — 2.80 kW P2P Trade | 1.20 kW Storage | 0.70 kW Grid Export');
      }, 13000);
      demoTimersRef.current.push(t3);

    } catch (err) {
      console.error(err);
      setIsDemoRunning(false);
      setDemoStage(0);
      setDemoStatusText('');
    }
  };

  const handleResetDemo = async () => {
    clearAllDemoTimers();
    try {
      setIsResetting(true);
      setIsDemoRunning(false);
      setDemoStage(0);
      setDemoStatusText('');
      await api.resetDemo();
      await fetchMapTelemetry(true);
      if (sceneRef.current) sceneRef.current.resetCamera();
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetView = () => {
    if (sceneRef.current) {
      sceneRef.current.resetCamera();
    }
  };

  if (loading && !observeData) return <LoadingState message="Initializing 3D Interactive Microgrid Canvas..." />;
  if (error && !observeData) return <ErrorState message={error} onRetry={() => fetchMapTelemetry(true)} />;

  const households = observeData?.households || [];
  const summary = observeData?.summary || {};
  const totalGen = summary.total_generation_kw || 0;
  const totalCon = summary.total_consumption_kw || 0;
  const netBalance = summary.net_community_balance_kw || 0;
  const batterySoc = summary.community_battery_soc || 40.0;
  const gridPrice = summary.current_grid_price || 6.10;

  // Build telemetry lookup
  const nodeStats = {};
  households.forEach((h) => {
    nodeStats[h.household_id] = h;
  });

  // Build 3D Active Flow Lines based on live telemetry / optimization / demo stage
  const active3DFlows = [];

  const houseAPos = NODE_3D_POSITIONS['house_a'];
  const houseBPos = NODE_3D_POSITIONS['house_b'];
  const batteryPos = NODE_3D_POSITIONS['COMMUNITY_BATTERY'];
  const gridPos = NODE_3D_POSITIONS['MAIN_UTILITY_GRID'];

  if (isDemoRunning) {
    // Stage 1+: Local Trade (House A -> House B)
    if (demoStage >= 1) {
      active3DFlows.push({
        id: 'demo-p2p',
        start: houseAPos,
        end: houseBPos,
        kw: 2.80,
        tariff: '₹4.50/kWh',
        type: 'P2P_TRADE',
        color: '#059669', // Emerald
        isActive: true,
      });
    }
    // Stage 2+: Storage Injection (House A -> Battery)
    if (demoStage >= 2) {
      active3DFlows.push({
        id: 'demo-storage',
        start: houseAPos,
        end: batteryPos,
        kw: 1.20,
        tariff: 'Buffer',
        type: 'STORAGE_INJECT',
        color: '#0d9488', // Teal
        isActive: true,
      });
    }
    // Stage 3+: Grid Export (House A -> Grid)
    if (demoStage >= 3) {
      active3DFlows.push({
        id: 'demo-export',
        start: houseAPos,
        end: gridPos,
        kw: 0.70,
        tariff: 'Feed-in',
        type: 'GRID_EXPORT',
        color: '#d97706', // Amber
        isActive: true,
      });
    }
  } else {
    // Live Backend Decisions & Trades
    // 1. P2P Trades
    trades.slice(0, 3).forEach((t) => {
      const startPos = NODE_3D_POSITIONS[t.seller_household_id];
      const endPos = NODE_3D_POSITIONS[t.buyer_household_id];
      if (startPos && endPos) {
        active3DFlows.push({
          id: `trade-${t.id}`,
          start: startPos,
          end: endPos,
          kw: t.energy_kwh,
          tariff: `₹${t.price_per_kwh?.toFixed(2)}/kWh`,
          type: 'P2P_TRADE',
          color: '#059669', // Emerald
          isActive: true,
        });
      }
    });

    // 2. Battery Storage Actions
    decisions
      .filter((d) => d.action === 'STORE' || d.action === 'BATTERY_CHARGE')
      .slice(0, 2)
      .forEach((d) => {
        const startPos = NODE_3D_POSITIONS[d.source_household];
        const endPos = NODE_3D_POSITIONS['COMMUNITY_BATTERY'];
        if (startPos && endPos) {
          active3DFlows.push({
            id: `store-${d.id}`,
            start: startPos,
            end: endPos,
            kw: d.energy_kwh,
            tariff: 'Storage Buffer',
            type: 'STORAGE_INJECT',
            color: '#0d9488', // Teal
            isActive: true,
          });
        }
      });

    // 3. Grid Export Actions
    decisions
      .filter((d) => d.action === 'GRID_EXPORT')
      .slice(0, 2)
      .forEach((d) => {
        const startPos = NODE_3D_POSITIONS[d.source_household];
        const endPos = NODE_3D_POSITIONS['MAIN_UTILITY_GRID'];
        if (startPos && endPos) {
          active3DFlows.push({
            id: `grid-exp-${d.id}`,
            start: startPos,
            end: endPos,
            kw: d.energy_kwh,
            tariff: 'Grid Export',
            type: 'GRID_EXPORT',
            color: '#d97706', // Amber
            isActive: true,
          });
        }
      });

    // Default active flow if database clean baseline
    if (active3DFlows.length === 0) {
      active3DFlows.push({
        id: 'fallback-p2p',
        start: NODE_3D_POSITIONS['house_a'],
        end: NODE_3D_POSITIONS['house_b'],
        kw: 2.80,
        tariff: '₹4.50/kWh',
        type: 'P2P_TRADE',
        color: '#059669',
        isActive: true,
      });
    }
  }

  // Selected Node Details
  const selectedNodeInfo = selectedNode ? (
    selectedNode === 'COMMUNITY_BATTERY' ? {
      name: 'Central Community Battery',
      household_type: 'BATTERY',
      status: 'STORE',
      generation_kw: 0,
      consumption_kw: 0,
      net_energy_kw: 0,
      battery_soc: batterySoc,
      predicted_demand: 'Buffer Safe',
      recent_action: 'Buffering local excess prosumer solar yield',
    } : selectedNode === 'MAIN_UTILITY_GRID' ? {
      name: 'Utility Substation Interconnection',
      household_type: 'GRID',
      status: 'GRID_EXPORT',
      generation_kw: 0,
      consumption_kw: 0,
      net_energy_kw: 0,
      battery_soc: null,
      predicted_demand: `Grid Tariff: ₹${gridPrice.toFixed(2)}/kWh`,
      recent_action: 'Receiving residual microgrid export & backup supply',
    } : {
      ...(nodeStats[selectedNode] || {}),
      name: selectedNode === 'house_a' ? 'House A (Solar Champion)' :
            selectedNode === 'house_b' ? 'House B (Heavy EV Load)' :
            selectedNode === 'house_c' ? 'House C (Balanced Prosumer)' :
            selectedNode === 'house_d' ? 'House D (Smart Apartment)' :
            'House E (Solar Villa)',
      predicted_demand: predictions.find(p => p.household_id === selectedNode)?.predicted_demand_kw ?
        `${predictions.find(p => p.household_id === selectedNode).predicted_demand_kw.toFixed(2)} kW` :
        selectedNode === 'house_a' ? '3.20 kW' : '4.10 kW',
      recent_action: decisions.find(d => d.source_household === selectedNode || d.target === selectedNode)?.action ||
        (nodeStats[selectedNode]?.status === 'SURPLUS' ? 'Local Trade Seller' : 'Local Trade Buyer'),
    }
  ) : null;

  return (
    <div className="space-y-4">
      {/* 3D Interactive Energy Map Container */}
      <div className="relative h-[640px] w-full rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        {/* 3D Canvas Scene */}
        <CommunityScene3D
          ref={sceneRef}
          households={households}
          batterySoc={batterySoc}
          gridPrice={gridPrice}
          activeFlows={active3DFlows}
          selectedNode={selectedNode}
          onSelectNode={(nodeId) => setSelectedNode(nodeId)}
        />

        {/* Top-Left Header Overlay */}
        <div className="absolute top-4 left-4 z-10 select-none">
          <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-md backdrop-blur-md">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900">LIVE ENERGY MAP</h2>
              <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9.5px] font-bold text-amber-800 border border-amber-200 uppercase">
                SIMULATED COMMUNITY DATA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Interactive 3D spatial microgrid energy-flow topology
            </p>
          </div>
        </div>

        {/* Top-Right Controls Overlay */}
        <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center gap-2 select-none">
          <div className="flex items-center rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-md backdrop-blur-md space-x-1.5">
            <button
              onClick={handleResetView}
              className="flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95"
              title="Reset 3D camera to default orientation"
            >
              <Compass className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset View</span>
            </button>

            <button
              onClick={() => fetchMapTelemetry(true)}
              disabled={isRefreshing}
              className="flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95 disabled:opacity-50"
              title="Sync live telemetry"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              onClick={handleResetDemo}
              disabled={isResetting}
              className="flex items-center space-x-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset Demo</span>
            </button>

            <button
              onClick={handleRunDemo}
              disabled={isDemoRunning}
              className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{isDemoRunning ? 'Running Demo...' : 'Run Demo'}</span>
            </button>
          </div>
        </div>

        {/* Demo Stage Live Progress Banner */}
        {demoStatusText && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 z-10 select-none max-w-xl w-full px-4">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/95 p-2.5 shadow-lg backdrop-blur-md text-center text-xs font-bold text-emerald-950 animate-in fade-in slide-in-from-top-2">
              <span className="mr-2">⚡</span>
              <span>{demoStatusText}</span>
            </div>
          </div>
        )}

        {/* Bottom-Left Map Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-10 select-none hidden sm:block">
          <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-md backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Map Legend</span>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3.5 gap-y-1 text-[11px] font-semibold text-slate-700">
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Surplus (Solar)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span>Deficit (Load)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                <span>Battery (Storage)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                <span>Grid Substation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom-Right Community Summary Overlay */}
        <div className="absolute bottom-4 right-4 z-10 select-none">
          <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-md backdrop-blur-md text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Community Summary</span>
              <span className="font-mono text-[10px] font-bold text-emerald-700">5 Smart Nodes</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 text-[10px]">Generation: </span>
                <span className="font-bold text-amber-700">{totalGen.toFixed(1)} kW</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Demand: </span>
                <span className="font-bold text-blue-700">{totalCon.toFixed(1)} kW</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Net Surplus: </span>
                <span className={`font-bold ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {netBalance >= 0 ? `+${netBalance.toFixed(1)}` : netBalance.toFixed(1)} kW
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Battery SOC: </span>
                <span className="font-bold text-teal-700">{batterySoc.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node 3D Inspector Panel (Slide-in on click) */}
        {selectedNodeInfo && (
          <div className="absolute top-18 right-4 z-20 w-72 select-none animate-in fade-in slide-in-from-right-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl backdrop-blur-md">
              <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inspecting Node</span>
                  <h4 className="text-xs font-bold text-slate-900">{selectedNodeInfo.name}</h4>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition text-xs font-bold"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2.5 space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Status:</span>
                  <StatusBadge status={selectedNodeInfo.status || selectedNodeInfo.household_type} />
                </div>
                {selectedNodeInfo.generation_kw > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Solar Generation:</span>
                    <span className="font-mono font-bold text-amber-600">{selectedNodeInfo.generation_kw.toFixed(2)} kW</span>
                  </div>
                )}
                {selectedNodeInfo.consumption_kw > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Active Demand:</span>
                    <span className="font-mono font-bold text-blue-600">{selectedNodeInfo.consumption_kw.toFixed(2)} kW</span>
                  </div>
                )}
                {selectedNodeInfo.net_energy_kw !== 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Net Balance:</span>
                    <span className={`font-mono font-bold ${selectedNodeInfo.net_energy_kw >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {selectedNodeInfo.net_energy_kw >= 0 ? `+${selectedNodeInfo.net_energy_kw.toFixed(2)}` : selectedNodeInfo.net_energy_kw.toFixed(2)} kW
                    </span>
                  </div>
                )}
                {selectedNodeInfo.predicted_demand && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Forecast / Capacity:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedNodeInfo.predicted_demand}</span>
                  </div>
                )}
                <div className="py-1">
                  <span className="text-slate-500 text-[11px]">Recent Routing Action:</span>
                  <p className="font-semibold text-slate-800 text-[11px] mt-0.5 leading-snug">
                    {selectedNodeInfo.recent_action}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active 3D Power Routing Links Detail Strip */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-card">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Active 3D Energy Routing Conduits
            </h3>
          </div>
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
            {active3DFlows.length} Active Conduits
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {active3DFlows.map((flow) => (
            <div key={flow.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: flow.color }} />
                <span className="font-mono font-bold text-slate-900">{flow.kw.toFixed(2)} kW</span>
                <span className="rounded bg-white border border-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                  {flow.type}
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-800 text-[11px]">{flow.tariff}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
