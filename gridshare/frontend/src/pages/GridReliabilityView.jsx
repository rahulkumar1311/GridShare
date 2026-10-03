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
