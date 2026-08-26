import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TopNavbar from './components/TopNavbar';
import DemoModal from './components/DemoModal';
import InteractiveMicrogridView from './pages/InteractiveMicrogridView';
import Optimization from './pages/Optimization';
import DashboardView from './pages/DashboardView';
import BatteryView from './pages/BatteryView';
import EnergyMapView from './pages/EnergyMapView';
import MarketplaceView from './pages/MarketplaceView';
import AiForecastView from './pages/AiForecastView';
import MyHomeView from './pages/MyHomeView';
import TransactionsView from './pages/TransactionsView';
import { api } from './services/api';

function MainLayout() {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(true);
  const [batterySoc, setBatterySoc] = useState(60);
  const [gridPrice, setGridPrice] = useState(6.10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchGlobalState = async () => {
    try {
      const res = await api.getHealth();
      setIsOnline(res.data?.status === 'healthy');
      const sumRes = await api.getEnergySummary();
      if (sumRes.data?.status === 'SUCCESS') {
        setGridPrice(sumRes.data.summary.base_grid_price || 6.10);
      }
      const batRes = await api.getBattery();
      if (batRes.data?.status === 'SUCCESS') {
        setBatterySoc(batRes.data.battery.current_soc || 60);
      }
    } catch (e) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    fetchGlobalState();
    const interval = setInterval(fetchGlobalState, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchGlobalState();
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleTriggerOptimization = async () => {
    try {
      setIsOptimizing(true);
      await api.runOptimization();
      await fetchGlobalState();
      setRefreshKey((prev) => prev + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleScenarioExecuted = async () => {
    await fetchGlobalState();
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex min-h-screen w-screen flex-col bg-slate-50 text-slate-900 overflow-x-hidden antialiased">
      {/* 🌟 Compact Horizontal Top Navigation Bar */}
      <TopNavbar
        isOnline={isOnline}
        batterySoc={batterySoc}
        gridPrice={gridPrice}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        onOpenDemoModal={() => setIsDemoModalOpen(true)}
        onTriggerOptimization={handleTriggerOptimization}
        isOptimizing={isOptimizing}
      />

      {/* Main Content Area with full viewport space */}
      <main className="flex-1 w-full px-3 py-3 sm:px-4 sm:py-3.5 max-w-[1680px] mx-auto" key={refreshKey}>
        <Routes>
          <Route path="/" element={<InteractiveMicrogridView />} />
          <Route path="/simulation" element={<InteractiveMicrogridView />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/battery" element={<BatteryView />} />
          <Route path="/community" element={<BatteryView />} />
          <Route path="/energy-map" element={<EnergyMapView />} />
          <Route path="/optimize" element={<Optimization />} />
          <Route path="/marketplace" element={<MarketplaceView />} />
          <Route path="/ai" element={<AiForecastView />} />
          <Route path="/my-home" element={<MyHomeView />} />
          <Route path="/transactions" element={<TransactionsView />} />
          <Route path="*" element={<Navigate to="/simulation" replace />} />
        </Routes>
      </main>

      {/* Global Demo Modal Controller */}
      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onScenarioExecuted={handleScenarioExecuted}
      />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}
