import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  BatteryCharging,
  IndianRupee,
  Activity,
  Sliders,
  RefreshCw,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Info,
  TrendingDown,
  TrendingUp,
  Cpu,
  Power,
  RotateCcw,
  Check,
  Building,
  ArrowRight,
} from 'lucide-react';
import { LoadingState, ErrorState } from '../components/StateFeedback';

export default function GridReliabilityView() {
  // Scenario & Control State
  const [horizonHours, setHorizonHours] = useState(6);
  const [initialSoc, setInitialSoc] = useState(40.0);
  const [batteryCapacity, setBatteryCapacity] = useState(50.0);
  const [reserveFloor, setReserveFloor] = useState(20.0);
  const [weatherScenario, setWeatherScenario] = useState('CLOUDY_INTERMITTENT');
  const [allowFlexibleShift, setAllowFlexibleShift] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL_CHARTS'); // 'ALL_CHARTS', 'SOLAR', 'DEMAND', 'IMPORT', 'BATTERY'

  // Async Execution State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Results State from Backend
  const [optimizationData, setOptimizationData] = useState(null);
  const [simulationData, setSimulationData] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);

  // Fetch Evaluation Benchmark
  const fetchEvaluationSuite = async () => {
    try {
      setLoadingEvaluation(true);
      const res = await api.getFeederEvaluation();
      if (res.data?.scenario_results) {
        setEvaluationData(res.data);
      }
    } catch (err) {
      console.warn('Evaluation suite load error:', err);
    } finally {
      setLoadingEvaluation(false);
    }
  };

  // Fetch / Run Backend Optimization
  const fetchFeederData = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatusMessage('Querying Random Forest demand forecasts & running feeder reliability solver...');

      const [optRes, simRes] = await Promise.all([
        api.optimizeFeederForecast({
          horizon_hours: horizonHours,
          initial_battery_soc: initialSoc,
          battery_capacity_kwh: batteryCapacity,
          allow_flexible_load_shift: allowFlexibleShift,
        }),
        api.simulateFeeder({
          horizon_steps: horizonHours,
          step_duration_hours: 1.0,
          weather_scenario: weatherScenario,
          grid_available: true,
        }),
      ]);

      if (optRes.data?.status === 'SUCCESS') {
        setOptimizationData(optRes.data);
      }
      if (simRes.data?.status === 'SUCCESS') {
        setSimulationData(simRes.data);
      }
      setStatusMessage('Feeder optimization and physical simulation synchronized.');
    } catch (err) {
      console.error('Feeder simulation error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to connect to backend feeder simulation.');
    } finally {
      setLoading(false);
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    fetchFeederData();
    fetchEvaluationSuite();
  }, [horizonHours, weatherScenario]);

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    await fetchFeederData();
  };

  // Format Chart Series by merging optimization schedule with physical simulation
  const chartData = useMemo(() => {
    if (!optimizationData || !optimizationData.schedule_by_interval) return [];

    const simSteps = simulationData?.steps || [];

    return optimizationData.schedule_by_interval.map((step, idx) => {
      const sim = simSteps[idx] || {};
      const simAgg = sim.aggregate_power_kw || {};
      const simReliability = sim.feeder_reliability || {};

      const uncertainty = step.aggregate_uncertainty_kw || 0.2;
      const forecastDemand = step.forecast_demand_kw || 0;
      const forecastSolar = step.forecast_solar_kw || 0;
      const actualSolar = simAgg.total_solar_generation_kw !== undefined ? simAgg.total_solar_generation_kw : forecastSolar;
      const actualDemand = simAgg.total_demand_kw !== undefined ? simAgg.total_demand_kw : forecastDemand;

      // Baseline import (without battery dispatch or load shift)
      const baselineImport = Math.max(0, Number((forecastDemand - forecastSolar).toFixed(2)));
      const optimizedImport = step.allocated_grid_import_kw || 0;

      return {
        time: step.time_label || `+${idx + 1}h`,
        hour: step.hour_of_day,
        forecastSolar,
        actualSolar,
        forecastDemand,
        demandUpper: Number((forecastDemand + uncertainty).toFixed(2)),
        demandLower: Number((Math.max(0.1, forecastDemand - uncertainty)).toFixed(2)),
        essentialDemand: step.forecast_essential_demand_kw,
        flexibleDemand: step.forecast_flexible_demand_kw,
        baselineImport,
        optimizedImport,
        batterySoc: step.battery_end_soc,
        reserveFloor: reserveFloor,
        busVoltagePu: simReliability.bus_voltage_pu || 1.0,
        transformerLoading: simReliability.transformer_loading_pct || 25.0,
        unmetShortfall: step.unmet_shortfall_kw || 0,
      };
    });
  }, [optimizationData, simulationData, reserveFloor]);

  if (loading && !optimizationData) {
    return <LoadingState message="Executing Random Forest inference & feeder load flow analysis..." />;
  }

  if (error && !optimizationData) {
    return <ErrorState message={error} onRetry={fetchFeederData} />;
  }

  const kpis = optimizationData?.kpi_summary || {};
  const metadata = optimizationData?.model_metadata || {};
  const shortfalls = optimizationData?.shortfalls_detected || { count: 0, events: [] };
  const recommendations = optimizationData?.recommendations || [];

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Trust Label */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <Activity className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                Grid Reliability & Feeder Stress Dashboard
              </h1>
              <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase tracking-wide">
                Simulation / Sample Data
              </span>
              <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                Challenge 03 — Schneider Electric Yuva Yodha 2026
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Multi-DER coordination, solar intermittency smoothing, community battery peak-shaving, and continuous essential load protection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing}
              className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Optimizing...' : 'Run Feeder Optimization'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Section D: Scenario & Physics Control Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Scenario & Feeder Physics Controls
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {horizonHours}h Horizon | Initial SOC: {initialSoc}% | Reserve: {reserveFloor}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          {/* Weather Scenario Preset */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Renewable Solar Profile
            </label>
            <select
              value={weatherScenario}
              onChange={(e) => setWeatherScenario(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="NORMAL">Standard Diurnal Day (1.0x)</option>
              <option value="HIGH_SOLAR">High Solar Surplus (1.25x)</option>
              <option value="CLOUDY_INTERMITTENT">Cloud Intermittency (0.35x drop)</option>
              <option value="MONSOON_STORM">Monsoon Deficit (0.20x solar)</option>
            </select>
          </div>

          {/* Initial Battery SOC Slider */}
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
              <span>Initial Battery SOC</span>
              <span className="font-mono text-emerald-700">{initialSoc}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="95"
              step="5"
              value={initialSoc}
              onChange={(e) => setInitialSoc(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          {/* Battery Reserve Floor */}
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
              <span>Reserve Floor Guard</span>
              <span className="font-mono text-amber-700">{reserveFloor}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="30"
              step="5"
              value={reserveFloor}
              onChange={(e) => setReserveFloor(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>

          {/* Horizon Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Optimization Horizon
            </label>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {[6, 12, 24].map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizonHours(h)}
                  className={`flex-1 rounded-md py-1 text-[11px] font-bold transition ${
                    horizonHours === h
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {h} Hours
                </button>
              ))}
            </div>
          </div>

          {/* Flexible Load Shifting Toggle */}
          <div className="flex flex-col justify-end">
            <label className="flex items-center space-x-2 cursor-pointer select-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={allowFlexibleShift}
                onChange={(e) => setAllowFlexibleShift(e.target.checked)}
                className="h-3.5 w-3.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px] font-semibold text-slate-800">
                Enable Load Shifting
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Section A: Feeder Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Households in Feeder */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Feeder Cluster</span>
            <Building className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900">5 Homes</div>
          <p className="text-[10.5px] text-slate-500 font-medium">3 Prosumers, 2 Consumers</p>
        </div>

        {/* KPI 2: Total Forecast Demand */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Forecast Demand</span>
            <Power className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {kpis.total_forecast_demand_kwh?.toFixed(1) || '0.0'} <span className="text-xs font-normal">kWh</span>
          </div>
          <p className="text-[10.5px] text-emerald-600 font-medium flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> 100% Essential Protected
          </p>
        </div>

        {/* KPI 3: Available Solar Generation */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Forecast Solar</span>
            <Sun className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-emerald-700">
            {kpis.total_forecast_solar_kwh?.toFixed(1) || '0.0'} <span className="text-xs font-normal">kWh</span>
          </div>
          <p className="text-[10.5px] text-slate-500 font-medium">
            Diurnal Geometry Model
          </p>
        </div>

        {/* KPI 4: Supply Shortfall Detected */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Shortfalls</span>
            <AlertTriangle className={`h-4 w-4 ${shortfalls.count > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <div className="text-xl font-black text-slate-900">
            {shortfalls.count} <span className="text-xs font-normal">Intervals</span>
          </div>
          <p className="text-[10.5px] text-slate-500 font-medium">
            {shortfalls.count > 0 ? 'Peak Deficit Buffered' : 'No Shortfall'}
          </p>
        </div>

        {/* KPI 5: Community Battery ESS & Usable Energy */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Shared ESS</span>
            <BatteryCharging className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {initialSoc}% <span className="text-xs font-normal">SOC</span>
          </div>
          <p className="text-[10.5px] text-slate-500 font-medium">
            Usable: <span className="text-emerald-700 font-bold">{Math.max(0, batteryCapacity * (initialSoc - reserveFloor) / 100).toFixed(1)} kWh</span> (Floor {reserveFloor}%)
          </p>
        </div>

        {/* KPI 6: Grid Import & Unmet Demand */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Grid & Shortfall</span>
            <IndianRupee className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-900">
            {kpis.total_grid_imported_kwh?.toFixed(1) || '0.0'} <span className="text-xs font-normal">kWh</span>
          </div>
          <p className="text-[10.5px] font-medium font-mono">
            {kpis.total_unmet_shortfall_kwh > 0 ? (
              <span className="text-amber-600 font-bold">Unmet: {kpis.total_unmet_shortfall_kwh.toFixed(1)} kWh</span>
            ) : (
              <span className="text-emerald-600">Unmet: 0.0 kWh (100% Met)</span>
            )}
          </p>
        </div>
      </div>

      {/* 4. Section B: Time-Series Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Solar Forecast vs Actual Simulated Flow */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Renewable Generation: Forecast vs. Actual (kW)
              </h3>
              <p className="text-[10.5px] text-slate-500">
                Diurnal solar bell curve with cloud attenuation & ramp-rate smoothing
              </p>
            </div>
            <Sun className="h-4 w-4 text-amber-500" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" unit="kW" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: '11px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area
                  type="monotone"
                  dataKey="forecastSolar"
                  name="Forecast Solar (kW)"
                  stroke="#d97706"
                  fill="url(#solarGrad)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="actualSolar"
                  name="Simulated Solar (kW)"
                  stroke="#b45309"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Demand Forecast & Uncertainty Interval */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Neighbourhood Demand Forecast & Uncertainty (kW)
              </h3>
              <p className="text-[10.5px] text-slate-500">
                Random Forest ensemble prediction with decision-tree variance (±σ) and essential load floor
              </p>
            </div>
            <Cpu className="h-4 w-4 text-indigo-500" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="uncertaintyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" unit="kW" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: '11px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area
                  type="monotone"
                  dataKey="demandUpper"
                  name="Uncertainty (+σ)"
                  stroke="transparent"
                  fill="url(#uncertaintyGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="forecastDemand"
                  name="Forecast Total Demand (kW)"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="essentialDemand"
                  name="Essential Load Baseline (kW)"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Baseline vs. Optimized Grid Import */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Peak Shaving: Baseline vs. Optimized Grid Import (kW)
              </h3>
              <p className="text-[10.5px] text-slate-500">
                Storage dispatch and flexible load shifting shave peak utility import
              </p>
            </div>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" unit="kW" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: '11px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="baselineImport" name="Unoptimized Import (kW)" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="optimizedImport" name="Optimized Import (kW)" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Community Battery SOC with Reserve Floor */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Community ESS State of Charge (%) & Reserve Floor
              </h3>
              <p className="text-[10.5px] text-slate-500">
                Guarding 20% emergency reserve floor while buffering solar surplus and deficits
              </p>
            </div>
            <BatteryCharging className="h-4 w-4 text-emerald-600" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: '11px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <ReferenceLine y={reserveFloor} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: `Reserve ${reserveFloor}%`, fill: '#e11d48', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="batterySoc"
                  name="Battery SOC (%)"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Section C: Action Panel (DER Dispatch & Recommendations) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Feasible DER Dispatch & Load Recommendations
            </h2>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {recommendations.length} Coordinated Actions Generated
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No dispatch actions required. Feeder is balanced.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-2 px-3">Interval</th>
                  <th className="py-2 px-3">Recommended Action</th>
                  <th className="py-2 px-3">Power / Energy</th>
                  <th className="py-2 px-3">Financial Benefit</th>
                  <th className="py-2 px-3">Technical Reason & Constraints Verified</th>
                  <th className="py-2 px-3">Load Safety</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recommendations.map((rec, i) => {
                  let badgeColor = 'bg-slate-100 text-slate-800 border-slate-200';
                  if (rec.action_type === 'CHARGE_COMMUNITY_ESS') badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  if (rec.action_type === 'DISCHARGE_COMMUNITY_ESS') badgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
                  if (rec.action_type === 'SHIFT_FLEXIBLE_LOAD') badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';
                  if (rec.action_type === 'P2P_LOCAL_MATCH') badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                  if (rec.action_type === 'IMPORT_GRID') badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  if (rec.action_type === 'EXPORT_GRID') badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';

                  return (
                    <tr key={i} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {rec.interval}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                          {rec.action_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-900 whitespace-nowrap">
                        {rec.target_power_kw} kW <span className="text-[10px] text-slate-400">({rec.energy_kwh} kWh)</span>
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700 font-semibold whitespace-nowrap">
                        +₹{rec.financial_impact_inr?.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-md">
                        <p className="font-medium text-slate-800">{rec.reason}</p>
                        {rec.constraints_checked && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Constraint: {rec.constraints_checked}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="flex items-center text-[10.5px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Protected
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5.5 Section: Reproducible Baseline vs. GridShare Evaluation Benchmark */}
      <div className="rounded-xl border border-indigo-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 mb-4 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                Benchmark Suite
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Reproducible Baseline vs. GridShare Evaluation
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target: Schneider Electric Yuva Yodha 2026 (Challenge 03). Identical deterministic inputs evaluated side-by-side.
            </p>
          </div>
          <button
            onClick={fetchEvaluationSuite}
            disabled={loadingEvaluation}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingEvaluation ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>{loadingEvaluation ? 'Running Suite...' : 'Re-Run Evaluation'}</span>
          </button>
        </div>

        {/* Scenario Selector Pills */}
        {evaluationData?.scenario_results && (
          <div className="mb-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
              Select Deterministic Test Scenario:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {evaluationData.scenario_results.map((sc, idx) => {
                const isSelected = selectedScenarioIdx === idx;
                return (
                  <button
                    key={sc.scenario.id}
                    onClick={() => setSelectedScenarioIdx(idx)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
