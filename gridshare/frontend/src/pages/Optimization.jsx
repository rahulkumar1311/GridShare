import React, { useState, useRef, useMemo } from 'react';
import InteractiveOptimizerScene3D, { OPTIMIZER_3D_POSITIONS } from '../components/energy-map-3d/InteractiveOptimizerScene3D';
import {
  Sliders,
  Play,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  BatteryCharging,
  IndianRupee,
  Activity,
  Layers,
  ArrowRight,
  Sun,
  Camera,
  Tag,
  Clock,
  Check
} from 'lucide-react';

export default function Optimization() {
  // 1. Manual Inputs State
  const [generation, setGeneration] = useState(6.0);
  const [load, setLoad] = useState(8.0);
  const [batterySoc, setBatterySoc] = useState(60);
  const [batteryCapacity, setBatteryCapacity] = useState(20.0);
  const [p2pAvailable, setP2pAvailable] = useState(2.5);
  const [p2pPrice, setP2pPrice] = useState(4.50);
  const [gridPrice, setGridPrice] = useState(6.00);

  // 2. Goal & Scenario
  const [goal, setGoal] = useState('BALANCED'); // 'MIN_COST', 'MAX_RENEWABLES', 'MIN_GRID', 'MAX_BATTERY', 'BALANCED'
  const [selectedScenario, setSelectedScenario] = useState('DEFAULT');

  // 3. Execution Lifecycle State
  const [status, setStatus] = useState('IDLE'); // 'IDLE', 'ANALYZING', 'CALCULATING', 'PLAN_READY', 'APPLYING', 'COMPLETED'
  const [statusMessage, setStatusMessage] = useState('');
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [optimizedPlan, setOptimizedPlan] = useState(null);

  // 4. Audit Trail History
  const [history, setHistory] = useState([
    {
      id: 'OPT-001',
      time: '10:00',
      scenario: 'Solar Noon',
      goal: 'Minimize Cost',
      gridImport: 0.5,
      p2pUsed: 2.0,
      batteryUsed: 1.0,
      cost: 18.0,
      savings: 30.0,
      status: 'APPLIED',
    },
    {
      id: 'OPT-002',
      time: '10:30',
      scenario: 'Evening Peak',
      goal: 'Balanced',
      gridImport: 1.2,
      p2pUsed: 2.5,
      batteryUsed: 3.5,
      cost: 24.5,
      savings: 23.5,
      status: 'APPLIED',
    }
  ]);

  const sceneRef = useRef();

  // Scenario Presets
  const handleSelectScenario = (scenarioKey) => {
    setSelectedScenario(scenarioKey);
    setStatus('IDLE');
    setOptimizedPlan(null);
    setActiveRoutes([]);

    if (scenarioKey === 'MORNING') {
      setGeneration(4.0);
      setLoad(5.5);
      setBatterySoc(50);
      setP2pAvailable(1.5);
      setP2pPrice(4.20);
      setGridPrice(5.80);
      setStatusMessage('Scenario: Morning Ramp (08:00) — Moderate solar output, residential ramp-up.');
    } else if (scenarioKey === 'SOLAR_NOON') {
      setGeneration(8.4);
      setLoad(5.2);
      setBatterySoc(70);
      setP2pAvailable(3.5);
      setP2pPrice(3.90);
      setGridPrice(6.00);
      setStatusMessage('Scenario: Solar Noon (12:00) — High renewable surplus with storage capacity.');
    } else if (scenarioKey === 'EVENING_PEAK') {
      setGeneration(0.8);
      setLoad(8.2);
      setBatterySoc(65);
      setP2pAvailable(2.0);
      setP2pPrice(5.20);
      setGridPrice(7.50);
      setStatusMessage('Scenario: Evening Peak (19:00) — High residential load & EV charging, elevated grid tariff.');
    } else if (scenarioKey === 'NIGHT') {
      setGeneration(0.0);
      setLoad(6.0);
      setBatterySoc(40);
      setP2pAvailable(0.5);
      setP2pPrice(4.80);
      setGridPrice(5.50);
      setStatusMessage('Scenario: Night Deficit (23:00) — Zero solar generation, baseline community draw.');
    } else if (scenarioKey === 'HIGH_DEMAND') {
      setGeneration(3.0);
      setLoad(9.5);
      setBatterySoc(80);
      setP2pAvailable(3.0);
      setP2pPrice(5.50);
      setGridPrice(8.50);
      setStatusMessage('Scenario: Grid Congestion — Peak utility pricing ₹8.50/kWh, maximizing local dispatch.');
    }
  };

  // 🧮 DETERMINISTIC OPTIMIZATION CALCULATION ENGINE
  const calculateOptimization = () => {
    const reserveSoc = 10; // 10% reserve floor
    const reserveKwh = (reserveSoc / 100) * batteryCapacity;
    const currentStoredKwh = (batterySoc / 100) * batteryCapacity;
    const availableBatteryKwh = Math.max(0, currentStoredKwh - reserveKwh);
    const availableBatteryHeadroom = Math.max(0, batteryCapacity - currentStoredKwh);

    // 1. Direct local solar allocation
    const solarUsed = Math.min(load, generation);
    const netDeficit = Math.max(0, load - solarUsed);
    const solarSurplus = Math.max(0, generation - solarUsed);

    let p2pUsed = 0;
    let batteryDischarge = 0;
    let gridImport = 0;
    let batteryStore = 0;
    let p2pSurplus = 0;
    let gridExport = 0;

    // 2. Goal-Based Deficit Allocation
    if (netDeficit > 0) {
      if (goal === 'MIN_COST') {
        // Priority 1: P2P if cheaper than Grid
        if (p2pPrice < gridPrice) {
          p2pUsed = Math.min(netDeficit, p2pAvailable);
          const rem1 = netDeficit - p2pUsed;
          batteryDischarge = Math.min(rem1, availableBatteryKwh);
          gridImport = Math.max(0, rem1 - batteryDischarge);
        } else {
          batteryDischarge = Math.min(netDeficit, availableBatteryKwh);
          const rem1 = netDeficit - batteryDischarge;
          p2pUsed = Math.min(rem1, p2pAvailable);
          gridImport = Math.max(0, rem1 - p2pUsed);
        }
      } else if (goal === 'MIN_GRID' || goal === 'MAX_RENEWABLES') {
        // Priority: Solar -> P2P -> Battery -> Grid last
        p2pUsed = Math.min(netDeficit, p2pAvailable);
        const rem1 = netDeficit - p2pUsed;
        batteryDischarge = Math.min(rem1, availableBatteryKwh);
        gridImport = Math.max(0, rem1 - batteryDischarge);
      } else if (goal === 'MAX_BATTERY') {
        batteryDischarge = Math.min(netDeficit, availableBatteryKwh);
        const rem1 = netDeficit - batteryDischarge;
        p2pUsed = Math.min(rem1, p2pAvailable);
        gridImport = Math.max(0, rem1 - p2pUsed);
      } else {
        // BALANCED (Multi-tier proportional routing)
        p2pUsed = Math.min(netDeficit * 0.5, p2pAvailable);
        const rem1 = netDeficit - p2pUsed;
        batteryDischarge = Math.min(rem1 * 0.7, availableBatteryKwh);
        gridImport = Math.max(0, netDeficit - p2pUsed - batteryDischarge);
      }
    }

    // 3. Surplus Allocation
    if (solarSurplus > 0) {
      batteryStore = Math.min(solarSurplus, availableBatteryHeadroom);
      const remSurplus = solarSurplus - batteryStore;
      p2pSurplus = Math.min(remSurplus, 3.0);
      gridExport = Math.max(0, remSurplus - p2pSurplus);
    }

    // 4. Financial & Environmental Accounting
    const unoptimizedCost = Number((load * gridPrice).toFixed(2));
    const optimizedCost = Number(
      ((solarUsed * 0) + (p2pUsed * p2pPrice) + (batteryDischarge * 0) + (gridImport * gridPrice)).toFixed(2)
    );
    const savings = Math.max(0, Number((unoptimizedCost - optimizedCost).toFixed(2)));
    const renewablePercent = Math.min(100, Math.round(((solarUsed + batteryDischarge + (p2pUsed * 0.8)) / Math.max(0.1, load)) * 100));
    const gridDependencyPercent = Math.min(100, Math.round((gridImport / Math.max(0.1, load)) * 100));

    // Dynamic AI Insight Narrative
    let insight = '';
    if (renewablePercent >= 75) {
      insight = `Renewable penetration is high at ${renewablePercent}%. Solar & P2P cover ${((solarUsed + p2pUsed) / load * 100).toFixed(0)}% of demand. Grid import is trimmed to ${gridImport.toFixed(1)} kWh, saving ₹${savings.toFixed(2)} (${Math.round((savings / unoptimizedCost) * 100)}% cost reduction).`;
    } else if (gridPrice >= 7.0) {
      insight = `Grid tariff is elevated at ₹${gridPrice.toFixed(2)}/kWh. The optimizer maximizes P2P trades (₹${p2pPrice.toFixed(2)}/kWh) and ${batteryDischarge.toFixed(1)} kWh battery discharge, avoiding ₹${savings.toFixed(2)} in peak grid surcharges.`;
    } else {
      insight = `Balanced allocation routes ${solarUsed.toFixed(1)} kWh solar locally, settles ${p2pUsed.toFixed(1)} kWh via P2P marketplace, and maintains safe ${reserveSoc}% ESS reserve floor.`;
    }

    return {
      load,
      solarUsed,
      p2pUsed,
      batteryDischarge,
      gridImport,
      solarSurplus,
      batteryStore,
      p2pSurplus,
      gridExport,
      unoptimizedCost,
      optimizedCost,
      savings,
      renewablePercent,
      gridDependencyPercent,
      insight,
    };
  };

  // ⚡ RUN OPTIMIZER (Multi-Step Animated Execution)
  const handleRunOptimizer = () => {
    setStatus('ANALYZING');
    setStatusMessage('Step 1/5: Analyzing community generation, prosumer surpluses & EV loads...');

    setTimeout(() => {
      setStatusMessage('Step 2/5: Inspecting solar availability & calculating local self-consumption...');

      setTimeout(() => {
        setStatusMessage('Step 3/5: Checking ESS headroom & P2P marketplace orderbook offers...');

        setTimeout(() => {
          setStatusMessage('Step 4/5: Comparing ₹' + p2pPrice.toFixed(2) + '/kWh P2P vs ₹' + gridPrice.toFixed(2) + '/kWh Grid tariff...');

          setTimeout(() => {
            const plan = calculateOptimization();
            setOptimizedPlan(plan);

            // Construct 3D routes based on the plan
            const routes = [];
            const hA = OPTIMIZER_3D_POSITIONS.house_a;
            const hB = OPTIMIZER_3D_POSITIONS.house_b;
            const hC = OPTIMIZER_3D_POSITIONS.house_c;
            const batt = OPTIMIZER_3D_POSITIONS.COMMUNITY_BATTERY;
            const gridPos = OPTIMIZER_3D_POSITIONS.MAIN_UTILITY_GRID;

            // Route 1: Solar / P2P from House A -> House B
            if (plan.p2pUsed > 0) {
              routes.push({
                id: 'route-p2p',
                start: hA,
                end: hB,
                kw: plan.p2pUsed,
                type: 'P2P',
                label: 'P2P Energy',
                color: '#059669',
              });
            }

            // Route 2: Battery Discharge -> House B
            if (plan.batteryDischarge > 0) {
              routes.push({
                id: 'route-battery',
                start: batt,
                end: hB,
                kw: plan.batteryDischarge,
                type: 'BATTERY',
                label: 'ESS Dispatch',
                color: '#0d9488',
              });
            }

            // Route 3: Grid Import -> House B (Subdued only if needed)
            if (plan.gridImport > 0) {
              routes.push({
                id: 'route-grid',
                start: gridPos,
                end: hB,
                kw: plan.gridImport,
                type: 'GRID',
                label: 'Grid Backup',
                color: '#2563eb',
              });
            }

            // Route 4: Surplus to Battery
            if (plan.batteryStore > 0) {
              routes.push({
                id: 'route-store',
                start: hA,
                end: batt,
                kw: plan.batteryStore,
                type: 'STORE',
                label: 'Storage Buffer',
                color: '#10b981',
              });
            }

            setActiveRoutes(routes);
            setStatus('PLAN_READY');
            setStatusMessage(`✅ OPTIMAL PLAN READY: Total Cost ₹${plan.optimizedCost.toFixed(2)} (Savings: ₹${plan.savings.toFixed(2)}). Click [APPLY PLAN] to execute.`);
          }, 400);
        }, 400);
      }, 400);
    }, 400);
  };

  // 🚀 APPLY OPTIMAL PLAN
  const handleApplyPlan = () => {
    if (!optimizedPlan) return;

    setStatus('APPLYING');
    setStatusMessage('Executing optimal energy routes across community microgrid...');

    setTimeout(() => {
      // Add to history
      const newEntry = {
        id: `OPT-${String(history.length + 1).padStart(3, '0')}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        scenario: selectedScenario,
        goal: goal.replace('_', ' '),
        gridImport: optimizedPlan.gridImport,
        p2pUsed: optimizedPlan.p2pUsed,
        batteryUsed: optimizedPlan.batteryDischarge,
        cost: optimizedPlan.optimizedCost,
        savings: optimizedPlan.savings,
        status: 'APPLIED',
      };
      setHistory((prev) => [newEntry, ...prev]);

      setStatus('COMPLETED');
      setStatusMessage('🎉 OPTIMIZATION APPLIED: All community households, ESS battery, and P2P order state synchronized.');
    }, 1800);
  };

  // Reset
  const handleReset = () => {
    setGeneration(6.0);
    setLoad(8.0);
    setBatterySoc(60);
    setP2pAvailable(2.5);
    setP2pPrice(4.50);
    setGridPrice(6.00);
    setGoal('BALANCED');
    setSelectedScenario('DEFAULT');
    setStatus('IDLE');
    setOptimizedPlan(null);
    setActiveRoutes([]);
    setStatusMessage('Optimizer reset to standard baseline.');
    if (sceneRef.current) sceneRef.current.resetCamera();
  };

  const households = [
    { id: 'house_a', name: 'House A (Solar)', generation: generation, consumption: 2.1, netEnergy: generation - 2.1, status: generation > 2.1 ? 'SURPLUS' : 'DEFICIT' },
    { id: 'house_b', name: 'House B (EV Load)', generation: 0.0, consumption: load - 2.1, netEnergy: -(load - 2.1), status: 'DEFICIT' },
    { id: 'house_c', name: 'House C (Prosumer)', generation: 2.0, consumption: 1.8, netEnergy: 0.2, status: 'BALANCED' },
  ];

  return (
    <div className="space-y-2.5 max-w-[1680px] mx-auto pb-6 select-none">
      {/* 🌟 1. TOP ROW: REAL-TIME OPTIMIZATION KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Total Cost */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-teal-800 font-bold uppercase">
            <span>Optimized Cost</span>
            <IndianRupee className="h-3 w-3 text-teal-600" />
          </div>
          <div className="font-mono font-extrabold text-teal-900 text-base mt-0.5">
            {optimizedPlan ? `₹${optimizedPlan.optimizedCost.toFixed(2)}` : '₹18.00'} <span className="text-[10px] text-slate-500 font-sans font-normal">(vs ₹{optimizedPlan ? optimizedPlan.unoptimizedCost.toFixed(0) : '60'})</span>
          </div>
        </div>

        {/* Savings */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold uppercase">
            <span>Cost Savings</span>
            <TrendingUp className="h-3 w-3 text-emerald-600" />
          </div>
          <div className="font-mono font-extrabold text-emerald-900 text-base mt-0.5">
            +{optimizedPlan ? `₹${optimizedPlan.savings.toFixed(2)}` : '₹42.00'} <span className="text-[10px] text-emerald-700 font-bold font-sans">({optimizedPlan ? Math.round((optimizedPlan.savings / optimizedPlan.unoptimizedCost) * 100) : 70}%)</span>
          </div>
        </div>

        {/* Renewable Penetration */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-blue-800 font-bold uppercase">
            <span>Renewable %</span>
            <Sun className="h-3 w-3 text-blue-600" />
          </div>
          <div className="font-mono font-extrabold text-blue-900 text-base mt-0.5">
            {optimizedPlan ? `${optimizedPlan.renewablePercent}%` : '88%'} <span className="text-xs text-slate-500 font-sans font-normal">Clean</span>
          </div>
        </div>

        {/* Grid Import */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-purple-800 font-bold uppercase">
            <span>Grid Import</span>
            <Layers className="h-3 w-3 text-purple-600" />
          </div>
          <div className="font-mono font-extrabold text-purple-900 text-base mt-0.5">
            {optimizedPlan ? `${optimizedPlan.gridImport.toFixed(1)} kWh` : '0.4 kWh'} <span className="text-[10px] text-slate-500 font-sans">({optimizedPlan ? optimizedPlan.gridDependencyPercent : 5.5}%)</span>
          </div>
        </div>

        {/* P2P Traded Volume */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-amber-800 font-bold uppercase">
            <span>P2P Volume</span>
            <Tag className="h-3 w-3 text-amber-600" />
          </div>
          <div className="font-mono font-extrabold text-slate-900 text-base mt-0.5">
            {optimizedPlan ? `${optimizedPlan.p2pUsed.toFixed(1)} kWh` : '2.0 kWh'} <span className="text-[10px] text-amber-800 font-mono">(@ ₹{p2pPrice.toFixed(1)})</span>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-slate-700 font-bold uppercase">
            <span>Optimizer State</span>
            <Activity className="h-3 w-3 text-slate-500" />
          </div>
          <div className="font-mono font-extrabold text-slate-900 text-sm mt-1">
            <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
              status === 'PLAN_READY' || status === 'COMPLETED'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : status === 'ANALYZING' || status === 'APPLYING'
                ? 'bg-purple-100 text-purple-800 border border-purple-300 animate-pulse'
                : 'bg-slate-100 text-slate-800'
            }`}>
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Narrative Banner */}
      {statusMessage && (
        <div className="flex items-center justify-between rounded-lg border border-teal-300 bg-teal-50/95 px-3 py-1 text-[11.5px] text-teal-950 shadow-2xs">
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage('')} className="text-teal-700 hover:text-teal-950 font-bold text-xs p-0.5">
            ✕
          </button>
        </div>
      )}

      {/* 🌟 2. MAIN 3-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* LEFT COLUMN: Inputs & Objectives (~22%) */}
        <div className="lg:col-span-3 space-y-2.5">
          {/* OPTIMIZATION GOAL SELECTOR */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-900">
                Optimization Objective
              </span>
              <span className="rounded bg-teal-50 px-1.5 py-0.2 text-[8.5px] font-bold text-teal-800 border border-teal-200">
                Deterministic
              </span>
            </div>

            <div className="space-y-1">
              {[
                { id: 'BALANCED', label: 'Balanced Optimization (Multi-Objective)' },
                { id: 'MIN_COST', label: 'Minimize Total Cost (Cheapest First)' },
                { id: 'MIN_GRID', label: 'Minimize Grid Dependency' },
                { id: 'MAX_RENEWABLES', label: 'Maximize Renewable Self-Consumption' },
                { id: 'MAX_BATTERY', label: 'Maximize Battery Utilization' },
              ].map((g) => (
                <label
                  key={g.id}
                  className={`flex items-center space-x-2 rounded-lg border p-1.5 cursor-pointer transition ${
                    goal === g.id
                      ? 'border-teal-400 bg-teal-50/60 font-bold text-teal-950'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="optimization-goal"
                    value={g.id}
                    checked={goal === g.id}
                    onChange={() => setGoal(g.id)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-[11px]">{g.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* MANUAL COMMUNITY INPUTS */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-900">
                Manual Inputs
              </span>
              <span className="text-[9px] font-mono text-slate-500 font-semibold">Editable</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-[9.5px] text-slate-500 font-medium">Solar Gen (kW):</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={generation}
                  onChange={(e) => setGeneration(Number(e.target.value) || 0)}
                  className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.8 text-[11px] font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <span className="text-[9.5px] text-slate-500 font-medium">Total Load (kW):</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={load}
                  onChange={(e) => setLoad(Number(e.target.value) || 0)}
                  className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.8 text-[11px] font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <span className="text-[9.5px] text-slate-500 font-medium">Battery SOC (%):</span>
                <input
                  type="number"
                  step="5"
                  min="10"
                  max="100"
                  value={batterySoc}
                  onChange={(e) => setBatterySoc(Number(e.target.value) || 0)}
                  className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.8 text-[11px] font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <span className="text-[9.5px] text-slate-500 font-medium">P2P Avail (kWh):</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={p2pAvailable}
                  onChange={(e) => setP2pAvailable(Number(e.target.value) || 0)}
                  className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.8 text-[11px] font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <span className="text-[9.5px] text-slate-500 font-medium">P2P Price (₹/kWh):</span>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="15"
                  value={p2pPrice}
                  onChange={(e) => setP2pPrice(Number(e.target.value) || 0)}
                  className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.8 text-[11px] font-mono font-bold text-emerald-800"
                />
              </div>
              <div>
                <span className="text-[9.5px] text-slate-500 font-medium">Grid Tariff (₹/kWh):</span>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="15"
                  value={gridPrice}
                  onChange={(e) => setGridPrice(Number(e.target.value) || 0)}
                  className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.8 text-[11px] font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Scenario Buttons */}
            <div className="pt-1 border-t border-slate-100">
              <span className="text-[9.5px] text-slate-500 font-semibold block mb-1">Scenario Presets:</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'MORNING', label: 'Morning' },
                  { id: 'SOLAR_NOON', label: 'Solar Noon' },
                  { id: 'EVENING_PEAK', label: 'Evening Peak' },
                  { id: 'NIGHT', label: 'Night' },
                  { id: 'HIGH_DEMAND', label: 'Congestion' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectScenario(s.id)}
                    className={`rounded border px-1 py-0.8 text-[9.5px] font-bold transition ${
                      selectedScenario === s.id
                        ? 'border-teal-400 bg-teal-50 text-teal-900'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Trigger Buttons */}
            <div className="space-y-1.5 pt-1.5">
              <button
                onClick={handleRunOptimizer}
                disabled={status === 'ANALYZING' || status === 'APPLYING'}
                className="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                <Play className={`h-3.5 w-3.5 ${status === 'ANALYZING' ? 'animate-spin' : 'fill-current'}`} />
                <span>{status === 'ANALYZING' ? 'ANALYZING MICROGRID...' : '⚡ RUN OPTIMIZER'}</span>
              </button>

              {status === 'PLAN_READY' && (
                <button
                  onClick={handleApplyPlan}
                  className="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white py-1.5 text-xs font-bold shadow-2xs transition active:scale-95 animate-bounce"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>APPLY OPTIMAL PLAN</span>
                </button>
              )}

              <button
                onClick={handleReset}
                className="flex w-full items-center justify-center space-x-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-1 text-[10.5px] font-semibold transition active:scale-95"
              >
                <RotateCcw className="h-3 w-3 text-slate-500" />
                <span>RESET DEMO</span>
              </button>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: 3D Microgrid Optimization Visualizer (~58%) */}
        <div className="lg:col-span-6 xl:col-span-6">
          <div className="flex flex-col h-full rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-card space-y-2">
            {/* 3D Header Bar & Camera Controls */}
            <div className="flex items-center justify-between px-1 text-xs">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-900">
                  3D Multi-Tier Optimal Energy Routing
                </span>
              </div>

              <div className="flex items-center space-x-1 text-[10px] font-semibold">
                <button
                  onClick={() => sceneRef.current?.resetCamera()}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.8 text-slate-700 hover:bg-slate-100 transition"
                  title="Default Angle"
                >
                  <Camera className="h-3 w-3 inline mr-1 text-slate-500" />
                  Reset View
                </button>
                <button
                  onClick={() => sceneRef.current?.topView()}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.8 text-slate-700 hover:bg-slate-100 transition hidden sm:inline"
                  title="Top-Down Angle"
                >
                  Top View
                </button>
                <button
                  onClick={() => sceneRef.current?.marketView()}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.8 text-slate-700 hover:bg-slate-100 transition hidden sm:inline"
                  title="Arena Perspective"
                >
                  Market View
                </button>
              </div>
            </div>

            {/* 3D Scene Viewport */}
            <div className="h-[430px] xl:h-[460px] w-full relative rounded-xl overflow-hidden">
              <InteractiveOptimizerScene3D
                ref={sceneRef}
                households={households}
                battery={{ soc: batterySoc, capacity: batteryCapacity }}
                grid={{ exportPrice: gridPrice }}
                activeRoutes={activeRoutes}
                isOptimizing={status === 'ANALYZING' || status === 'APPLYING'}
              />

              {/* Dynamic Overlay Floating Badge */}
              <div className="absolute top-2.5 left-2.5 pointer-events-none">
                <div className="flex items-center space-x-1.5 rounded-full border border-slate-200 bg-white/95 px-2.5 py-0.5 shadow-2xs backdrop-blur-md">
                  <span className={`h-1.5 w-1.5 rounded-full ${activeRoutes.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-[10px] font-bold text-slate-800">
                    {activeRoutes.length > 0 ? `${activeRoutes.length} Optimal Routes Active` : 'Click [RUN OPTIMIZER] to solve'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Optimization Result, Allocation & Insights (~20%) */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-2.5">
          {/* OPTIMIZATION RESULT CARD */}
          <div className="rounded-xl border border-emerald-200 bg-white p-3 shadow-card space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100">
              <span className="font-extrabold text-[11px] text-emerald-950 uppercase tracking-wide">
                Optimal Allocation
              </span>
              <span className="font-mono text-[9px] font-bold text-emerald-700">
                Load: {load} kWh
              </span>
            </div>

            {/* Visual Allocation Breakdown */}
            <div className="space-y-1.5 text-[10.5px]">
              <div>
                <div className="flex justify-between text-slate-700 mb-0.5">
                  <span>1. Solar Generation:</span>
                  <span className="font-mono font-bold text-slate-900">{optimizedPlan ? optimizedPlan.solarUsed.toFixed(1) : '4.0'} kWh</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${((optimizedPlan ? optimizedPlan.solarUsed : 4.0) / load) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-0.5">
                  <span>2. P2P Marketplace:</span>
                  <span className="font-mono font-bold text-emerald-800">{optimizedPlan ? optimizedPlan.p2pUsed.toFixed(1) : '2.0'} kWh</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${((optimizedPlan ? optimizedPlan.p2pUsed : 2.0) / load) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-0.5">
                  <span>3. Community ESS:</span>
                  <span className="font-mono font-bold text-teal-800">{optimizedPlan ? optimizedPlan.batteryDischarge.toFixed(1) : '0.8'} kWh</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full"
                    style={{ width: `${((optimizedPlan ? optimizedPlan.batteryDischarge : 0.8) / load) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-0.5">
                  <span>4. Utility Grid Backup:</span>
                  <span className="font-mono font-bold text-blue-900">{optimizedPlan ? optimizedPlan.gridImport.toFixed(1) : '0.4'} kWh</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${((optimizedPlan ? optimizedPlan.gridImport : 0.4) / load) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Surplus Routing if any */}
            {optimizedPlan && optimizedPlan.solarSurplus > 0 && (
              <div className="rounded bg-emerald-50/60 border border-emerald-200 p-1.5 text-[10px] text-emerald-950 font-mono">
                Surplus: <strong>+{optimizedPlan.solarSurplus.toFixed(1)} kWh</strong> (Stored: {optimizedPlan.batteryStore.toFixed(1)} kWh, Listed: {optimizedPlan.p2pSurplus.toFixed(1)} kWh).
              </div>
            )}
          </div>

          {/* AI OPTIMIZER INSIGHT & WHY THIS PLAN */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 shadow-card space-y-1.5 text-xs">
            <div className="flex items-center space-x-1.5 pb-1 border-b border-teal-100">
              <Sparkles className="h-3.5 w-3.5 text-teal-700" />
              <span className="font-extrabold text-[11px] text-teal-950">
                Why This Plan?
              </span>
            </div>

            <p className="text-[10.5px] text-slate-700 leading-relaxed font-sans">
              {optimizedPlan ? optimizedPlan.insight : `Solar covers primary load locally. P2P energy (₹${p2pPrice.toFixed(2)}/kWh) is prioritized over peak grid tariffs (₹${gridPrice.toFixed(2)}/kWh) while preserving safe 10% battery reserves.`}
            </p>

            <div className="space-y-1 pt-1 border-t border-teal-100 text-[10px] text-slate-600">
              <div className="flex items-center space-x-1">
                <Check className="h-3 w-3 text-emerald-600" />
                <span>Zero grid dependency during peak solar</span>
              </div>
              <div className="flex items-center space-x-1">
                <Check className="h-3 w-3 text-emerald-600" />
                <span>P2P trade cleared at fair community midpoint</span>
              </div>
              <div className="flex items-center space-x-1">
                <Check className="h-3 w-3 text-emerald-600" />
                <span>10% ESS reserve preserved for blackout safety</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 3. BOTTOM ROW: OPTIMIZATION DECISION AUDIT TRAIL TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card space-y-2 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-emerald-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Optimization Decision Audit Trail & Performance History
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-slate-500">
            {history.length} Plans Solved
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Scenario</th>
                <th className="px-3 py-2">Objective</th>
                <th className="px-3 py-2 text-right">P2P Volume</th>
                <th className="px-3 py-2 text-right">Battery Dispatch</th>
                <th className="px-3 py-2 text-right">Grid Import</th>
                <th className="px-3 py-2 text-right">Optimized Cost</th>
                <th className="px-3 py-2 text-right">Savings</th>
                <th className="px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-3 py-2 text-slate-500">{h.time}</td>
                  <td className="px-3 py-2 font-sans font-bold text-slate-900">{h.scenario}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded px-1.5 py-0.2 text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {h.goal}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-800">{h.p2pUsed.toFixed(1)} kWh</td>
                  <td className="px-3 py-2 text-right font-bold text-teal-800">{h.batteryUsed.toFixed(1)} kWh</td>
                  <td className="px-3 py-2 text-right text-blue-900">{h.gridImport.toFixed(1)} kWh</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900">₹{h.cost.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-700">+₹{h.savings.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-emerald-700 font-bold">{h.status} ✓</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
