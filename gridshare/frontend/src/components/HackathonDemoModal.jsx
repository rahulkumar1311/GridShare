import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  Sun,
  Power,
  BatteryCharging,
  Network,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';

export default function HackathonDemoModal({ isOpen, onClose, onScenarioExecuted }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [demoResult, setDemoResult] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  if (!isOpen) return null;

  const handleRunDemo = async () => {
    setIsRunning(true);
    setDemoResult(null);
    setCurrentStep(1);

    try {
      // Step 1 -> Step 2
      await new Promise(r => setTimeout(r, 600));
      setCurrentStep(2);

      // Call backend demo execution
      const res = await api.runDemoScenario();
      await new Promise(r => setTimeout(r, 600));
      setCurrentStep(3);

      await new Promise(r => setTimeout(r, 600));
      setCurrentStep(4);

      if (res.data?.status === 'SUCCESS') {
        setDemoResult(res.data);
        if (onScenarioExecuted) onScenarioExecuted();
      }

      await new Promise(r => setTimeout(r, 500));
      setCurrentStep(5);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await api.resetDemo();
      setResetMessage('✅ Demo data reset to clean baseline.');
      setDemoResult(null);
      setCurrentStep(0);
      if (onScenarioExecuted) onScenarioExecuted();
      setTimeout(() => setResetMessage(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 border border-amber-300 uppercase tracking-wider">
                DEMO MODE — SIMULATED DATA
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                3-5 Min Pitch Controller
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">
              Sunny Afternoon Community Scenario
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Deterministic, reproducible live demo for hackathon judges & presentations
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1">
            ✕
          </button>
        </div>

        {/* Demo Scenario Preset Specification */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-white p-2.5 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase">House A (Solar)</span>
              <div className="font-bold text-slate-900 mt-0.5">Gen: 6.8 kW</div>
              <div className="text-slate-500">Con: 2.1 kW</div>
              <div className="font-mono font-bold text-emerald-700 mt-1 text-[11px]">Surplus: +4.7 kW</div>
            </div>

            <div className="rounded-lg bg-white p-2.5 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase">House B (Consumer)</span>
              <div className="font-bold text-slate-900 mt-0.5">Gen: 1.2 kW</div>
              <div className="text-slate-500">Con: 4.0 kW</div>
              <div className="font-mono font-bold text-rose-600 mt-1 text-[11px]">Deficit: -2.8 kW</div>
            </div>

            <div className="rounded-lg bg-white p-2.5 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-teal-700 uppercase">Central Storage</span>
              <div className="font-bold text-slate-900 mt-0.5">SOC: 40.0%</div>
              <div className="text-slate-500">Capacity: 50 kWh</div>
              <div className="font-mono font-bold text-teal-700 mt-1 text-[11px]">Buffer Safe</div>
            </div>

            <div className="rounded-lg bg-white p-2.5 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-700 uppercase">Grid Tariff</span>
              <div className="font-bold text-slate-900 mt-0.5">₹6.10 / kWh</div>
              <div className="text-slate-500">P2P: ₹4.50</div>
              <div className="font-mono font-bold text-emerald-700 mt-1 text-[11px]">Save ₹1.60/kWh</div>
            </div>
          </div>
        </div>

        {/* 10-Step Execution Pipeline Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Automated Microgrid Dispatch Pipeline:</span>
            {isRunning && <span className="text-emerald-700 animate-pulse font-semibold">Executing Stage {currentStep}/5...</span>}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
              currentStep >= 1 ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-100 bg-slate-50/50 text-slate-400'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="font-bold">1. Observe & Classify:</span>
                <span>House A (Surplus +4.7 kW) & House B (Deficit -2.8 kW)</span>
              </div>
              {currentStep >= 1 && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </div>

            <div className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
              currentStep >= 2 ? 'border-purple-300 bg-purple-50 text-purple-900' : 'border-slate-100 bg-slate-50/50 text-slate-400'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="font-bold">2. ML Demand Forecast:</span>
                <span>Random Forest predicted short-term household loads</span>
              </div>
              {currentStep >= 2 && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
            </div>

            <div className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
              currentStep >= 3 ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-100 bg-slate-50/50 text-slate-400'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="font-bold">3. GridShare Optimizer Allocation:</span>
                <span className="font-mono font-bold">2.8kW Local Trade | 1.2kW Battery | 0.7kW Export</span>
              </div>
              {currentStep >= 3 && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </div>

            <div className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
              currentStep >= 4 ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-100 bg-slate-50/50 text-slate-400'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="font-bold">4. Bilateral Transaction Settlement:</span>
                <span>House A ➔ House B (2.80 kWh @ ₹4.50/kWh = ₹12.60)</span>
              </div>
              {currentStep >= 4 && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
            </div>

            <div className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
              currentStep >= 5 ? 'border-emerald-400 bg-emerald-100 text-emerald-950 font-bold' : 'border-slate-100 bg-slate-50/50 text-slate-400'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="font-bold">5. Telemetry & Energy Map Updated:</span>
                <span>Real-time power vectors energized across all views</span>
              </div>
              {currentStep >= 5 && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={handleReset}
            disabled={isResetting || isRunning}
            className="flex items-center justify-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Data</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Close
            </button>
            <button
              onClick={handleRunDemo}
              disabled={isRunning}
              className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{isRunning ? 'Running Demo...' : 'Execute Sunny Afternoon Demo'}</span>
            </button>
          </div>
        </div>

        {resetMessage && (
          <p className="mt-2 text-center text-xs font-semibold text-emerald-700">{resetMessage}</p>
        )}
      </div>
    </div>
  );
}
