import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import ResidentialHouseCanvas3D from '../components/home-3d/ResidentialHouseCanvas3D';
import HomeEnergyModes from '../components/home/HomeEnergyModes';
import HomeApplianceManager, { APPLIANCE_DEFAULTS } from '../components/home/HomeApplianceManager';
import HomeBatteryManager from '../components/home/HomeBatteryManager';
import HomeManualControlPanel from '../components/home/HomeManualControlPanel';
import HomeP2PTradingCard from '../components/home/HomeP2PTradingCard';
import HomeFinancialScoreCard from '../components/home/HomeFinancialScoreCard';
import HomeTimelineSimulator from '../components/home/HomeTimelineSimulator';
import HomeActivityLog from '../components/home/HomeActivityLog';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import StatusBadge from '../components/StatusBadge';
import { LoadingState, ErrorState } from '../components/StateFeedback';
import {
  Home,
  Sun,
  Power,
  BatteryCharging,
  Zap,
  IndianRupee,
  ShieldCheck,
  Cpu,
  Clock,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Lock,
  RotateCcw,
  Sparkles,
  Cloud,
  CheckCircle2,
  Sliders,
  Maximize2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function MyHomeView() {
  // 1. Shared Global / Backend State
  const [households, setHouseholds] = useState([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('house_a');
  const [liveReadings, setLiveReadings] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [myTrades, setMyTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 2. Household Dynamic Configuration & Simulation State
  const [energyMode, setEnergyMode] = useState('AUTO'); // 'AUTO' | 'SELF_USE' | 'BATTERY_FIRST' | 'SELL_SURPLUS' | 'GRID_BACKUP'
  const [solarBaseKw, setSolarBaseKw] = useState(4.80);
  const [cloudCover, setCloudCover] = useState(false);
  const [batteryCapacity, setBatteryCapacity] = useState(10.0);
  const [batterySoc, setBatterySoc] = useState(68.0);
  const [batteryReservePercent, setBatteryReservePercent] = useState(20);

  // 3. Appliance States
  const [appliances, setAppliances] = useState({
    livingRoom: true, // 0.4 kW
    kitchen: true, // 0.8 kW
    ac: true, // 1.2 kW
    fridge: true, // 0.2 kW
    washingMachine: false, // 0.3 kW
  });

  // 4. Timeline & 3D Day Simulation
  const [timeHour, setTimeHour] = useState(12);
  const [isPlayingDay, setIsPlayingDay] = useState(false);
  const simTimerRef = useRef(null);

  // 5. Selected 3D Object Detail Drawer
  const [selected3DElement, setSelected3DElement] = useState(null);

  // 6. Cumulative Daily History & Activities
  const [activityLogs, setActivityLogs] = useState([
    { time: '10:30', action: 'Battery Charge', energy: 1.5, source: 'Solar Array', destination: 'Home Battery', status: 'COMPLETED' },
    { time: '11:45', action: 'P2P Green Sale', energy: 1.0, source: 'Rooftop Solar', destination: 'House B (EV)', status: 'COMPLETED' },
    { time: '12:00', action: 'System Equilibrium', energy: 2.6, source: 'Solar Array', destination: 'Home Appliances', status: 'ACTIVE' },
  ]);

  // Financial accumulators
  const [todaySolarGenKwh, setTodaySolarGenKwh] = useState(18.4);
  const [todayHomeConKwh, setTodayHomeConKwh] = useState(12.7);
  const [todayStoredKwh, setTodayStoredKwh] = useState(3.2);
  const [todayP2PSoldKwh, setTodayP2PSoldKwh] = useState(1.5);
  const [todayP2PBoughtKwh, setTodayP2PBoughtKwh] = useState(0.0);
  const [todayGridImportKwh, setTodayGridImportKwh] = useState(2.0);
  const [todayGridExportKwh, setTodayGridExportKwh] = useState(1.0);

  // Fetch initial household & marketplace data from backend
  const fetchBackendData = async () => {
    try {
      setError(null);
      const [hRes, obsRes, predRes, tRes] = await Promise.all([
        api.getHouseholds(),
        api.getCommunityState(),
        api.getPredictions(),
        api.getMarketTransactions(50),
      ]);

      if (hRes.data?.status === 'SUCCESS') setHouseholds(hRes.data.households || []);
      if (obsRes.data?.status === 'SUCCESS') setLiveReadings(obsRes.data.data.households || []);
      if (predRes.data?.status === 'SUCCESS') setPredictions(predRes.data.predictions || []);
      if (tRes.data?.status === 'SUCCESS') {
        const allTrades = tRes.data.transactions || [];
        setMyTrades(
          allTrades.filter(
            (t) => t.seller_household_id === selectedHouseholdId || t.buyer_household_id === selectedHouseholdId
          )
        );
      }
    } catch (err) {
      console.error('Failed to sync backend telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
    const interval = setInterval(fetchBackendData, 6000);
    return () => clearInterval(interval);
  }, [selectedHouseholdId]);

  // Calculate Active Home Demand based on toggled appliances
  const currentDemandKw = useMemo(() => {
    let sum = 0;
    APPLIANCE_DEFAULTS.forEach((app) => {
      if (appliances[app.id]) sum += app.powerKw;
    });
    return Math.round(sum * 10) / 10;
  }, [appliances]);

  // Calculate Solar Output based on base setting, cloud cover, and time of day curve
  const currentSolarKw = useMemo(() => {
    // Diurnal factor: 0 at night, peaks around 12:00-13:00
    let timeFactor = 0;
    if (timeHour >= 6 && timeHour <= 18) {
      timeFactor = Math.sin(((timeHour - 6) / 12) * Math.PI);
    }
    let solar = solarBaseKw * timeFactor;
    if (cloudCover) {
      solar *= 0.55; // 45% reduction under cloud cover
    }
    return Math.max(0, Math.round(solar * 100) / 100);
  }, [solarBaseKw, cloudCover, timeHour]);

  // -------------------------------------------------------------
  // HOME ENERGY ALLOCATION LOGIC (Mathematical Router)
  // -------------------------------------------------------------
  const {
    surplusKw,
    deficitKw,
    isSurplus,
    batteryPowerKw, // + charge, - discharge
    gridPowerKw, // + export, - import
    p2pPowerKw, // + sell, - buy
    energyFlowLabel,
  } = useMemo(() => {
    const netRaw = currentSolarKw - currentDemandKw;
    const isSurplusVal = netRaw >= 0;

    let batPwr = 0;
    let gridPwr = 0;
    let p2pPwr = 0;
    let flowLabel = '';

    const storedKwh = (batteryCapacity * batterySoc) / 100;
    const reserveKwh = (batteryCapacity * batteryReservePercent) / 100;
    const maxChargeRoom = Math.max(0, batteryCapacity - storedKwh);
    const availableDischarge = Math.max(0, storedKwh - reserveKwh);

    if (isSurplusVal) {
      const remainingSurplus = netRaw;

      if (energyMode === 'AUTO') {
        const chargePossible = Math.min(remainingSurplus, maxChargeRoom, 2.5);
        batPwr = chargePossible;
        const leftOver = remainingSurplus - chargePossible;
        if (leftOver > 0.05) {
          p2pPwr = leftOver * 0.7;
          gridPwr = leftOver * 0.3;
        }

        const flows = [`☀ SOLAR → 🏠 HOME (${Math.min(currentSolarKw, currentDemandKw).toFixed(1)} kW)`];
        if (chargePossible > 0.05) {
          flows.push(`☀ SOLAR → 🔋 BATTERY (${chargePossible.toFixed(1)} kW)`);
        }
        if (p2pPwr > 0.05) {
          flows.push(`🏠 HOME → 🤝 P2P (${p2pPwr.toFixed(1)} kW)`);
        }
        if (gridPwr > 0.05) {
          flows.push(`🏠 HOME → ⚡ GRID (${gridPwr.toFixed(1)} kW)`);
        }
        flowLabel = flows.join('  •  ');
      } else if (energyMode === 'SELF_USE') {
        const chargePossible = Math.min(remainingSurplus, maxChargeRoom, 3.0);
        batPwr = chargePossible;
        const leftOver = remainingSurplus - chargePossible;
        if (leftOver > 0.05) gridPwr = leftOver;

        const flows = [`☀ SOLAR → 🏠 HOME (${Math.min(currentSolarKw, currentDemandKw).toFixed(1)} kW)`];
        if (chargePossible > 0.05) {
          flows.push(`☀ SOLAR → 🔋 BATTERY (${chargePossible.toFixed(1)} kW)`);
        }
        if (gridPwr > 0.05) {
          flows.push(`🏠 HOME → ⚡ GRID (${gridPwr.toFixed(1)} kW)`);
        }
        flowLabel = flows.join('  •  ');
      } else if (energyMode === 'BATTERY_FIRST') {
        const chargePossible = Math.min(currentSolarKw, maxChargeRoom, 3.5);
        batPwr = chargePossible;
        const remainingForHome = currentSolarKw - chargePossible;
        if (remainingForHome < currentDemandKw) {
          gridPwr = -(currentDemandKw - remainingForHome);
        }

        const flows = [`☀ SOLAR → 🔋 BATTERY (${chargePossible.toFixed(1)} kW)`];
        if (remainingForHome > 0) {
          flows.push(`☀ SOLAR → 🏠 HOME (${remainingForHome.toFixed(1)} kW)`);
        }
        if (gridPwr < -0.05) {
          flows.push(`⚡ GRID → 🏠 HOME (${Math.abs(gridPwr).toFixed(1)} kW)`);
        }
        flowLabel = flows.join('  •  ');
      } else if (energyMode === 'SELL_SURPLUS') {
        p2pPwr = remainingSurplus;
        flowLabel = `☀ SOLAR → 🏠 HOME (${Math.min(currentSolarKw, currentDemandKw).toFixed(1)} kW)  •  🏠 HOME → 🤝 P2P (${p2pPwr.toFixed(1)} kW)`;
      } else if (energyMode === 'GRID_BACKUP') {
        gridPwr = remainingSurplus;
        flowLabel = `☀ SOLAR → 🏠 HOME (${Math.min(currentSolarKw, currentDemandKw).toFixed(1)} kW)  •  🏠 HOME → ⚡ GRID (${gridPwr.toFixed(1)} kW)`;
      }
    } else {
      // DEFICIT: Solar < Demand
      const deficit = Math.abs(netRaw);

      if (energyMode === 'GRID_BACKUP') {
        gridPwr = -deficit;
        const flows = [];
        if (currentSolarKw > 0.05) {
          flows.push(`☀ SOLAR → 🏠 HOME (${currentSolarKw.toFixed(1)} kW)`);
        }
        flows.push(`⚡ GRID → 🏠 HOME (${deficit.toFixed(1)} kW)`);
        flowLabel = flows.join('  •  ');
      } else {
        const dischargePossible = Math.min(deficit, availableDischarge, 2.5);
        batPwr = -dischargePossible;
        const remainingDeficit = deficit - dischargePossible;

        const flows = [];
        if (currentSolarKw > 0.05) {
          flows.push(`☀ SOLAR → 🏠 HOME (${currentSolarKw.toFixed(1)} kW)`);
        }
        if (dischargePossible > 0.05) {
          flows.push(`🔋 BATTERY → 🏠 HOME (${dischargePossible.toFixed(1)} kW)`);
        }
        if (remainingDeficit > 0.05) {
          gridPwr = -remainingDeficit;
          flows.push(`⚡ GRID → 🏠 HOME (${remainingDeficit.toFixed(1)} kW)`);
        }
        flowLabel = flows.length > 0 ? flows.join('  •  ') : '⚡ Equilibrium / Standby';
      }
    }

    return {
      surplusKw: Math.max(0, Math.round(netRaw * 100) / 100),
      deficitKw: Math.max(0, Math.round(-netRaw * 100) / 100),
      isSurplus: isSurplusVal,
      batteryPowerKw: Math.round(batPwr * 100) / 100,
      gridPowerKw: Math.round(gridPwr * 100) / 100,
      p2pPowerKw: Math.round(p2pPwr * 100) / 100,
      energyFlowLabel: flowLabel || '⚡ Equilibrium / Standby',
    };
  }, [currentSolarKw, currentDemandKw, batteryCapacity, batterySoc, batteryReservePercent, energyMode]);

  // -------------------------------------------------------------
  // 24-Hour Simulation Playback Loop
  // -------------------------------------------------------------
  useEffect(() => {
    if (isPlayingDay) {
      simTimerRef.current = setInterval(() => {
        setTimeHour((prev) => {
          const next = (prev + 1) % 24;
          return next;
        });
      }, 1400);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isPlayingDay]);

  // Handle Toggle Appliance
  const handleToggleAppliance = (appId) => {
    setAppliances((prev) => {
      const nextState = !prev[appId];
      const app = APPLIANCE_DEFAULTS.find((a) => a.id === appId);
      const newLog = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: nextState ? `${app?.name} Switched ON` : `${app?.name} Switched OFF`,
        energy: app?.powerKw || 0,
        source: 'Home Circuit',
        destination: nextState ? 'Appliance Load' : 'Idle',
        status: 'COMPLETED',
      };
      setActivityLogs((logs) => [newLog, ...logs.slice(0, 15)]);
      return { ...prev, [appId]: nextState };
    });
  };

  // Handle Manual Override Apply
  const handleApplyManualValues = ({ solarKw, demandKw, batterySoc: newSoc, batteryCapacity: newCap }) => {
    setSolarBaseKw(solarKw);
    setBatterySoc(newSoc);
    setBatteryCapacity(newCap);

    // Adjust appliances baseline proportionally if user manually modified demand
    const log = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: 'Manual Energy Setpoint Override',
      energy: solarKw,
      source: 'User Controller',
      destination: 'Energy Engine',
      status: 'COMPLETED',
    };
    setActivityLogs((logs) => [log, ...logs.slice(0, 15)]);
  };

  // Handle Manual Battery Charge
  const handleChargeBattery = (amountKwh) => {
    setBatterySoc((prev) => Math.min(100, prev + (amountKwh / batteryCapacity) * 100));
    setTodayStoredKwh((prev) => prev + amountKwh);
    const log = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: 'Manual Battery Charge',
      energy: amountKwh,
      source: 'Solar / Grid',
      destination: 'Home Battery',
      status: 'COMPLETED',
    };
    setActivityLogs((logs) => [log, ...logs.slice(0, 15)]);
  };

  // Handle Manual Battery Discharge
  const handleDischargeBattery = (amountKwh) => {
    setBatterySoc((prev) => Math.max(batteryReservePercent, prev - (amountKwh / batteryCapacity) * 100));
    const log = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: 'Manual Battery Discharge',
      energy: amountKwh,
      source: 'Home Battery',
      destination: 'Home Load',
      status: 'COMPLETED',
    };
    setActivityLogs((logs) => [log, ...logs.slice(0, 15)]);
  };

  // Handle P2P Listing (Sell Surplus)
  const handleListP2PSell = async ({ householdId, energyKwh, pricePerKwh }) => {
    try {
      await api.createOffer({
        household_id: householdId,
        energy_kwh: energyKwh,
        min_price_per_kwh: pricePerKwh,
      });
      // Optionally run continuous double auction matching
      await api.matchOrders();
      await fetchBackendData();

      setTodayP2PSoldKwh((prev) => prev + energyKwh);
      const log = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: 'P2P Surplus Offer Created',
        energy: energyKwh,
        source: 'Rooftop PV',
        destination: 'P2P Marketplace',
        status: 'COMPLETED',
      };
      setActivityLogs((logs) => [log, ...logs.slice(0, 15)]);
    } catch (err) {
      console.error('Error creating P2P offer:', err);
      throw err;
    }
  };

  // Handle P2P Purchase (Buy Deficit)
  const handleBuyP2PEnergy = async ({ householdId, energyKwh, pricePerKwh }) => {
    try {
      await api.createRequest({
        household_id: householdId,
        energy_kwh: energyKwh,
        max_price_per_kwh: pricePerKwh,
      });
      await api.matchOrders();
      await fetchBackendData();

      setTodayP2PBoughtKwh((prev) => prev + energyKwh);
      const log = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: 'P2P Energy Purchase Executed',
        energy: energyKwh,
        source: 'Peer Prosumer',
        destination: 'Home Load',
        status: 'COMPLETED',
      };
      setActivityLogs((logs) => [log, ...logs.slice(0, 15)]);
    } catch (err) {
      console.error('Error creating P2P request:', err);
      throw err;
    }
  };

  // Handle Grid Export & Import
  const handleExportToGrid = (amountKwh) => {
    setTodayGridExportKwh((prev) => prev + amountKwh);
    const log = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: 'Grid Export Feed-in',
      energy: amountKwh,
      source: 'Rooftop Solar',
      destination: 'Utility Grid',
      status: 'COMPLETED',
    };
    setActivityLogs((logs) => [log, ...logs.slice(0, 15)]);
  };

  const handleImportFromGrid = (amountKwh) => {
    setTodayGridImportKwh((prev) => prev + amountKwh);
    const log = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: 'Grid Import Draw',
      energy: amountKwh,
      source: 'Utility Grid',
      destination: 'Home Load',
      status: 'COMPLETED',
    };
    setActivityLogs((logs) => [log, ...logs.slice(0, 15)]);
  };

  // -------------------------------------------------------------
  // Preset Demo Scenarios
  // -------------------------------------------------------------
  const handleLoadDemo = () => {
    setSolarBaseKw(4.80);
    setCloudCover(false);
    setTimeHour(12);
    setIsPlayingDay(false);
    setBatteryCapacity(10.0);
    setBatterySoc(68.0);
    setBatteryReservePercent(20);
    setEnergyMode('AUTO');
    setAppliances({
      livingRoom: true, // 0.4 kW
      kitchen: true, // 0.8 kW
      ac: true, // 1.2 kW
      fridge: true, // 0.2 kW (Total = 2.6 kW)
      washingMachine: false,
    });
    const log = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: 'Loaded Hackathon Demo Scenario',
      energy: 4.8,
      source: 'Preset Scenario',
      destination: 'GridShare Twin',
      status: 'COMPLETED',
    };
    setActivityLogs((logs) => [log, ...logs.slice(0, 15)]);
  };

  const handleResetDemo = () => {
    setSolarBaseKw(4.80);
    setCloudCover(false);
    setTimeHour(12);
    setIsPlayingDay(false);
    setBatteryCapacity(10.0);
    setBatterySoc(60.0);
    setBatteryReservePercent(20);
    setEnergyMode('AUTO');
    setAppliances({
      livingRoom: true,
      kitchen: true,
      ac: false,
      fridge: true,
      washingMachine: false,
    });
  };

  // Selected Household object
  const currentHousehold = households.find((h) => h.id === selectedHouseholdId) || {
    id: selectedHouseholdId,
    name: 'House A (Solar Champion)',
    household_type: 'PROSUMER',
    location: 'Plot 101, Green Enclave',
  };

  // Simulated 24-Hour Diurnal Chart Data for this specific Home
  const homeDiurnalCurve = useMemo(() => {
    return [
      { time: '00:00', solar: 0.0, load: 1.2 },
      { time: '03:00', solar: 0.0, load: 0.9 },
      { time: '06:00', solar: 0.8, load: 1.6 },
      { time: '09:00', solar: 3.5, load: 2.1 },
      { time: '12:00', solar: currentSolarKw, load: currentDemandKw },
      { time: '15:00', solar: 3.8, load: 2.0 },
      { time: '18:00', solar: 1.2, load: 3.8 },
      { time: '21:00', solar: 0.0, load: 2.8 },
    ];
  }, [currentSolarKw, currentDemandKw]);

  // Home Energy Score Calculation (0 to 100)
  const homeEnergyScore = useMemo(() => {
    let score = 50;
    if (isSurplus) score += 20;
    if (batterySoc >= batteryReservePercent) score += 15;
    if (appliances.ac && isSurplus) score += 5;
    if (!cloudCover && currentSolarKw > 3.0) score += 10;
    return Math.min(98, Math.max(45, score));
  }, [isSurplus, batterySoc, batteryReservePercent, appliances, cloudCover, currentSolarKw]);

  if (loading && households.length === 0) {
    return <LoadingState message="Connecting to Residential Digital Twin Node..." />;
  }

  return (
    <div className="space-y-4">
      {/* ==================== 1. TOP HEADER & QUICK DEMO CONTROLS ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs gap-3">
        {/* Household Identification */}
        <div className="flex items-center space-x-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">{currentHousehold.name}</h2>
              <StatusBadge status={currentHousehold.household_type || 'PROSUMER'} />
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                LIVE TWIN ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {currentHousehold.location} • Smart Meter Node: #{selectedHouseholdId.toUpperCase()} • GridShare P2P Protocol
            </p>
          </div>
        </div>

        {/* Quick Demo & Mode Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Household Selector */}
          <select
            value={selectedHouseholdId}
            onChange={(e) => setSelectedHouseholdId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-emerald-600"
          >
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.household_type})
              </option>
            ))}
          </select>

          {/* Load Demo Button */}
          <button
            onClick={handleLoadDemo}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>LOAD HOME DEMO</span>
          </button>

          {/* Reset Demo Button */}
          <button
            onClick={handleResetDemo}
            className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchBackendData();
              setTimeout(() => setIsRefreshing(false), 400);
            }}
            disabled={isRefreshing}
            className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* ==================== 2. PRIMARY TELEMETRY KPI TILES ==================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Current Generation */}
        <StatCard
          title="Current Generation"
          value={currentSolarKw.toFixed(2)}
          unit="kW"
          subtitle={cloudCover ? "Cloud Cover Active (55% Irradiance)" : "Rooftop Monocrystalline PV"}
          icon={Sun}
          accentColor="solar"
          badgeText={currentSolarKw > 0 ? "Active PV" : "Standby"}
          badgeType={currentSolarKw > 0 ? "warning" : "neutral"}
        />

        {/* Current Consumption */}
        <StatCard
          title="Current Consumption"
          value={currentDemandKw.toFixed(2)}
          unit="kW"
          subtitle={`${Object.values(appliances).filter(Boolean).length} Active Household Appliances`}
          icon={Power}
          accentColor="blue"
          badgeText="Active Load"
          badgeType="neutral"
        />

        {/* Net Balance */}
        <StatCard
          title="Net Energy Balance"
          value={isSurplus ? `+${surplusKw.toFixed(2)}` : `-${deficitKw.toFixed(2)}`}
          unit="kW"
          subtitle={isSurplus ? "Surplus charging battery & selling P2P" : "Deficit met via battery & local grid"}
          icon={Zap}
          accentColor={isSurplus ? "emerald" : "blue"}
          badgeText={isSurplus ? "SURPLUS EXPORTER" : "DEFICIT CONSUMER"}
          badgeType={isSurplus ? "success" : "neutral"}
        />

        {/* Home Battery SOC */}
        <StatCard
          title="Home Battery Storage"
          value={`${batterySoc.toFixed(0)}%`}
          unit={`(${((batteryCapacity * batterySoc) / 100).toFixed(1)} kWh)`}
          subtitle={`Capacity: ${batteryCapacity.toFixed(0)} kWh • Reserve: ${batteryReservePercent}%`}
          icon={BatteryCharging}
          accentColor="emerald"
          badgeText={batteryPowerKw > 0 ? "CHARGING" : batteryPowerKw < 0 ? "DISCHARGING" : "STANDBY"}
          badgeType={batteryPowerKw > 0 ? "success" : batteryPowerKw < 0 ? "warning" : "neutral"}
        />
      </div>

      {/* ==================== 3. MAIN INTERACTIVE 3-COLUMN WORKSPACE ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Controls & Appliances (4 Cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Energy Management Modes */}
          <HomeEnergyModes activeMode={energyMode} onSelectMode={setEnergyMode} />

          {/* Interactive Appliances Manager */}
          <HomeApplianceManager
            appliances={appliances}
            onToggleAppliance={handleToggleAppliance}
            totalDemandKw={currentDemandKw}
          />

          {/* Home Battery Manager */}
          <HomeBatteryManager
            capacity={batteryCapacity}
            soc={batterySoc}
            reservePercent={batteryReservePercent}
            chargeKw={batteryPowerKw > 0 ? batteryPowerKw : 0}
            dischargeKw={batteryPowerKw < 0 ? Math.abs(batteryPowerKw) : 0}
            status={batteryPowerKw > 0 ? 'CHARGING' : batteryPowerKw < 0 ? 'DISCHARGING' : 'IDLE'}
            onChargeBattery={handleChargeBattery}
            onDischargeBattery={handleDischargeBattery}
            onChangeReserve={setBatteryReservePercent}
          />

          {/* Manual Control Panel */}
          <HomeManualControlPanel
            solarKw={solarBaseKw}
            demandKw={currentDemandKw}
            batterySoc={batterySoc}
            batteryCapacity={batteryCapacity}
            cloudCover={cloudCover}
            onApplyManualValues={handleApplyManualValues}
            onToggleCloudCover={() => setCloudCover((prev) => !prev)}
          />
        </div>

        {/* CENTER HERO: 3D Residential Cutaway House (5 Cols on lg) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* 3D Canvas Hero Container */}
          <div className="relative h-[490px] w-full rounded-xl overflow-hidden shadow-card border border-slate-200">
            <ResidentialHouseCanvas3D
              solarKw={currentSolarKw}
              loadKw={currentDemandKw}
              batterySoc={batterySoc}
              batteryCapacity={batteryCapacity}
              batteryPowerKw={batteryPowerKw}
              gridPowerKw={gridPowerKw}
              p2pPowerKw={p2pPowerKw}
              appliances={appliances}
              cloudCover={cloudCover}
              timeHour={timeHour}
              selectedElement={selected3DElement}
              onSelectElement={setSelected3DElement}
            />

            {/* Overlaid Bottom Energy Flow Status Ribbon */}
            <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-slate-700/80 bg-slate-900/90 p-2.5 backdrop-blur-md shadow-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                  ACTIVE FLOW:
                </span>
                <span className="font-mono text-xs font-bold text-emerald-300">
                  {energyFlowLabel}
                </span>
              </div>

              {selected3DElement && (
                <button
                  onClick={() => setSelected3DElement(null)}
                  className="text-[10px] text-slate-400 hover:text-white font-medium underline"
                >
                  Clear Inspect
                </button>
              )}
            </div>
          </div>

          {/* 24-Hour Simulation Timeline Controller */}
          <HomeTimelineSimulator
            currentHour={timeHour}
            isPlaying={isPlayingDay}
            onTogglePlay={() => setIsPlayingDay((prev) => !prev)}
            onSelectHour={(h) => {
              setTimeHour(h);
              setIsPlayingDay(false);
            }}
            onResetTimeline={() => {
              setTimeHour(12);
              setIsPlayingDay(false);
            }}
          />
        </div>

        {/* RIGHT COLUMN: P2P Trading, Financials & Score (3 Cols on lg) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Smart Meter & P2P Trading */}
          <HomeP2PTradingCard
            surplusKw={surplusKw}
            deficitKw={deficitKw}
            isSurplus={isSurplus}
            selectedHouseholdId={selectedHouseholdId}
            onListP2PSell={handleListP2PSell}
            onBuyP2PEnergy={handleBuyP2PEnergy}
            onExportToGrid={handleExportToGrid}
            onImportFromGrid={handleImportFromGrid}
            gridTariff={6.10}
            p2pTariff={4.50}
          />

          {/* Daily Energy Financials & Home Energy Score */}
          <HomeFinancialScoreCard
            solarSavings={todaySolarGenKwh * 6.10}
            p2pEarnings={todayP2PSoldKwh * 4.50}
            p2pPurchases={todayP2PBoughtKwh * 4.50}
            gridCost={todayGridImportKwh * 6.10}
            gridExportEarnings={todayGridExportKwh * 3.50}
            energyScore={homeEnergyScore}
          />
        </div>
      </div>

      {/* ==================== 4. BOTTOM SECTION: PROFILE CHART & ACTIVITY HISTORY ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Generation vs Consumption Profile */}
        <ChartCard
          title={`Today's Generation vs Load Profile (${currentHousehold.name})`}
          subtitle="Hourly solar curve and household demand trajectory (kW)"
          headerRight={
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600 font-medium">Solar (kW)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 font-medium">Load (kW)</span>
              </div>
            </div>
          }
        >
          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={homeDiurnalCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mySolarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="myLoadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} unit=" kW" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="solar"
                  stroke="#d97706"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#mySolarGrad)"
                  name="Solar Gen (kW)"
                />
                <Area
                  type="monotone"
                  dataKey="load"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#myLoadGrad)"
                  name="Home Demand (kW)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* My Home Activity History */}
        <HomeActivityLog activities={activityLogs} />
      </div>

      {/* ==================== 5. BILATERAL P2P TRANSACTIONS LEDGER ==================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Household P2P Microgrid Trade Activity
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Synchronized transactions where {currentHousehold.name} is the seller or buyer
            </p>
          </div>
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
            {myTrades.length} Matched Trades
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-400 bg-slate-50/60">
              <tr>
                <th className="py-2 px-3">Tx ID</th>
                <th className="py-2 px-3">Time</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Counterparty</th>
                <th className="py-2 px-3">Energy Volume</th>
                <th className="py-2 px-3">P2P Tariff</th>
                <th className="py-2 px-3">Total (INR)</th>
                <th className="py-2 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myTrades.length > 0 ? (
                myTrades.map((tx) => {
                  const isSeller = tx.seller_household_id === selectedHouseholdId;
                  const counterparty = isSeller ? tx.buyer_household_id : tx.seller_household_id;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 font-mono font-bold text-slate-400">#TX-{tx.id}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {tx.timestamp
                          ? new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Live'}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            isSeller ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isSeller ? 'SELLER (Sold Surplus)' : 'BUYER (Bought Green)'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-800">{counterparty}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{tx.energy_kwh?.toFixed(2)} kWh</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">₹{tx.price_per_kwh?.toFixed(2)}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">₹{tx.total_value?.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-5 text-center text-slate-400">
                    No P2P trades recorded yet for this household node.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
