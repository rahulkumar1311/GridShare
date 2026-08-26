import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import SummaryCards from '../components/SummaryCards';
import LiveEnergyChart from '../components/LiveEnergyChart';
import MLPredictionCard from '../components/MLPredictionCard';
import P2PTradingTable from '../components/P2PTradingTable';
import NodeStatusGrid from '../components/NodeStatusGrid';
import { RefreshCw, Play, ShieldAlert } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInferring, setIsInferring] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await api.getDashboardSummary();
      if (res.data?.status === 'SUCCESS') {
        setData(res.data.data);
      }
      const histRes = await api.getEnergyHistory({ hours: 24, limit: 30 });
      if (histRes.data?.status === 'SUCCESS') {
        setHistory(histRes.data.history);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRunPredictions = async () => {
    try {
      setIsInferring(true);
      await api.runPredictions();
      await fetchDashboardData();
    } catch (err) {
      console.error('Prediction inference error:', err);
    } finally {
      setIsInferring(false);
    }
  };

  const handleMatchTrades = async () => {
    try {
      setIsMatching(true);
      await api.runOptimization();
      await fetchDashboardData();
    } catch (err) {
      console.error('Optimization engine error:', err);
    } finally {
      setIsMatching(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-3 text-emerald-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="font-semibold">Loading GridShare Microgrid State...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with PPT Demo quick action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-gray-900/60 to-gray-900/40 p-5 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Community Microgrid Overview</h2>
          <p className="text-xs text-gray-300">
            Real-time telemetry, AI solar/load forecasting & decentralized P2P power routing.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center space-x-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-gray-700 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleMatchTrades}
            disabled={isMatching}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isMatching ? 'Routing Energy...' : 'Trigger Energy Routing'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <SummaryCards data={data} />

      {/* Charts & ML Predictions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveEnergyChart history={history} />
        </div>
        <div>
          <MLPredictionCard
            predictions={data?.recent_predictions || []}
            onRunPredictions={handleRunPredictions}
            isRunning={isInferring}
          />
        </div>
      </div>

      {/* Node Grid */}
      <NodeStatusGrid nodes={data?.live_nodes || []} />

      {/* P2P Trading Ledger */}
      <P2PTradingTable
        trades={data?.recent_trades || []}
        onMatchTrades={handleMatchTrades}
        isMatching={isMatching}
      />
    </div>
  );
}
