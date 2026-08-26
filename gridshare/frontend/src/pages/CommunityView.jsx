import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import BatteryOwnership3D from '../components/3d/BatteryOwnership3D';
import StatusBadge from '../components/StatusBadge';
import { LoadingState, ErrorState } from '../components/StateFeedback';
import {
  BatteryCharging,
  Zap,
  ShieldCheck,
  RotateCcw,
  Play,
  RefreshCw,
  Home,
  IndianRupee,
  Layers,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function CommunityView() {
  const [nodes, setNodes] = useState([]);
  const [batteryState, setBatteryState] = useState(null);
  const [ownershipData, setOwnershipData] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Demo Runner state
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoFeedback, setDemoFeedback] = useState(null);
  const [visMode, setVisMode] = useState('CONTRIBUTION'); // CONTRIBUTION or WITHDRAWAL

  const fetchAllData = async () => {
    try {
      setError(null);
      const [obsRes, battRes, ownRes, ledgRes] = await Promise.all([
        api.getCommunityState(),
        api.getBattery(),
        api.getBatteryOwnership(),
        api.getBatteryLedger(30),
      ]);

      if (obsRes.data?.status === 'SUCCESS') setNodes(obsRes.data.data.households || []);
      if (battRes.data?.status === 'SUCCESS') setBatteryState(battRes.data.battery);
      if (ownRes.data?.status === 'SUCCESS') setOwnershipData(ownRes.data.data);
      if (ledgRes.data?.status === 'SUCCESS') setLedgerEntries(ledgRes.data.ledger || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load community battery ownership data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRunBatteryFairnessDemo = async () => {
    try {
      setIsDemoRunning(true);
      setDemoFeedback('Executing Step 1: House A (10 kWh) & House B (1 kWh) contributing to shared battery...');
      setVisMode('CONTRIBUTION');

      const res = await api.runBatteryFairnessDemo();
      if (res.data?.status === 'SUCCESS') {
        setTimeout(async () => {
          setVisMode('WITHDRAWAL');
          setDemoFeedback('Executing Step 2: Proportional withdrawal of 5.0 kWh (House A: 4.545 kWh | House B: 0.455 kWh)...');
          await fetchAllData();

          setTimeout(() => {
            setDemoFeedback('✅ Battery Fairness Demo Complete: Individual contribution credits maintained with zero unfair depletion.');
            setIsDemoRunning(false);
          }, 3000);
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      setIsDemoRunning(false);
      setDemoFeedback('Error executing battery fairness demo.');
    }
  };

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
      setDemoFeedback(null);
      setVisMode('CONTRIBUTION');
      await fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !batteryState) return <LoadingState message="Loading Community Battery & Ownership Ledgers..." />;
  if (error && !batteryState) return <ErrorState message={error} onRetry={fetchAllData} />;

  const shares = ownershipData?.ownership_shares || [];
  const soc = batteryState?.current_soc || 40.0;
  const stored = batteryState?.current_energy_kwh || 11.0;
  const capacity = batteryState?.capacity_kwh || 50.0;
  const efficiency = batteryState?.efficiency_percent || 90.0;
  const availableDispatch = batteryState?.available_dispatch_kwh || 0.0;
  const totalCredits = ownershipData?.total_active_credits_kwh || 0.0;

  return (
    <div className="space-y-6">
      {/* Header & Demo Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-card gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">Community Battery Ownership & Fair Accounting</h2>
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">
              Proportional Credit Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Transparent tracking of individual household storage credits with 90% round-trip efficiency accounting.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleResetDemo}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleRunBatteryFairnessDemo}
            disabled={isDemoRunning}
            className="flex items-center space-x-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-subtle hover:bg-teal-700 transition active:scale-95 disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 ${isDemoRunning ? 'animate-spin' : 'fill-current'}`} />
            <span>{isDemoRunning ? 'Simulating Fairness...' : 'Run Battery Fairness Demo'}</span>
          </button>
        </div>
      </div>

      {/* Demo Feedback Banner */}
      {demoFeedback && (
        <div className="rounded-xl border border-teal-300 bg-teal-50/95 p-3 shadow-xs text-xs font-bold text-teal-950 animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-teal-700 shrink-0" />
            <span>{demoFeedback}</span>
          </div>
        </div>
      )}

      {/* 3D Ownership Mesh & KPI Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Central 3D Mesh Canvas (2 cols) */}
        <div className="lg:col-span-2">
          <BatteryOwnership3D
            batterySoc={soc}
            capacity={capacity}
            storedEnergy={stored}
            efficiency={efficiency}
            ownershipShares={shares}
            mode={visMode}
          />
        </div>

        {/* Battery Technical Status Card (1 col) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <BatteryCharging className="h-4 w-4 text-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">ESS Technical State</h3>
              </div>
              <span className="font-mono text-xs font-bold text-teal-800">{soc.toFixed(1)}% SOC</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Physical Energy Stored:</span>
                <span className="font-mono font-bold text-slate-900">{stored.toFixed(2)} kWh</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Nameplate Capacity:</span>
                <span className="font-mono font-bold text-slate-900">{capacity.toFixed(0)} kWh</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Round-Trip Efficiency:</span>
                <span className="font-mono font-bold text-teal-700">{efficiency}% (10% Loss)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Total Active Credits:</span>
                <span className="font-mono font-bold text-emerald-700">{totalCredits.toFixed(2)} kWh</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Dispatchable Headroom:</span>
                <span className="font-mono font-bold text-slate-900">{availableDispatch.toFixed(2)} kWh</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
            <span className="font-bold text-slate-800">Policy: </span>
            <span>PROPORTIONAL_OWNERSHIP (Withdrawals dynamically allocated by credit share).</span>
          </div>
        </div>
      </div>

      {/* Household Ownership Breakdown Bars & Explainability */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Ownership Percentage Breakdown (2 cols) */}
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Household Energy Ownership Breakdown</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Real Database Credits</span>
          </div>

          <div className="space-y-4">
            {shares.map((s) => (
              <div key={s.household_id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 uppercase">{s.household_id}</span>
                    <span className="text-[11px] text-slate-500">
                      (Contributed: {s.contributed_kwh.toFixed(1)} kWh → Usable: {s.usable_credit_kwh.toFixed(2)} kWh)
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-teal-800">{s.remaining_credit_kwh.toFixed(3)} kWh Credit</span>
                    <span className="font-mono text-slate-500 font-bold">{s.ownership_percent.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(2, s.ownership_percent))}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Withdrawn: {s.withdrawn_kwh.toFixed(2)} kWh</span>
                  <span>Simulated Value: ₹{s.estimated_value_inr.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Explainability Section: Why Ownership Tracking? */}
        <div className="rounded-xl border border-teal-200/90 bg-teal-50/40 p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-teal-100 mb-3">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-950">Why Ownership Tracking?</h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              GridShare tracks household contributions to the community battery so stored energy is not treated as an anonymous pool.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed mt-2.5">
              By default, future withdrawals are allocated proportionally to available household energy credits (e.g. 10/11 vs 1/11).
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-teal-100 text-[10.5px] text-slate-500 font-medium">
            <span className="font-bold text-slate-700">Notice: </span>
            All monetary metrics are simulated economic valuations for prototyping.
          </div>
        </div>
      </div>

      {/* Battery Ledger Audit Trail */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-slate-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Battery Ledger & Audit Trail</h3>
          </div>
          <span className="font-mono text-xs text-slate-500 font-bold">{ledgerEntries.length} Recorded Events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Household</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2 text-right">Energy (kWh)</th>
                <th className="px-3 py-2 text-right">Usable (kWh)</th>
                <th className="px-3 py-2 text-right">Battery Stored</th>
                <th className="px-3 py-2 text-right">Simulated Value</th>
                <th className="px-3 py-2">Reason / Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerEntries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                    {e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                  </td>
                  <td className="px-3 py-2 font-bold text-slate-900">{e.household_id || 'Community'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-1.5 py-0.2 text-[10px] font-bold ${
                      e.action_type === 'CONTRIBUTION' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                      {e.action_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{e.energy_kwh.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-teal-700">{e.usable_kwh.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-700">{e.balance_after_kwh.toFixed(2)} kWh ({e.soc_after_percent.toFixed(0)}%)</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">₹{e.economic_value_inr?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-500 text-[11px] max-w-xs truncate">{e.reason || e.policy_applied}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
