import React, { useState } from 'react';
import { api } from '../services/api';
import { Play, CheckCircle2, Zap, Send, ShieldAlert, Sparkles } from 'lucide-react';

export default function SimulatorView() {
  const [statusMsg, setStatusMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  // PPT Demo scenario payload
  const handleTriggerPPTDemo = async () => {
    setIsSending(true);
    setStatusMsg('Broadcasting deterministic PPT demo scenario...');
    try {
      const packets = [
        { household_id: 'house_a', generation_kw: 6.80, consumption_kw: 2.10, battery_soc: 85.0, source: 'SIMULATED' },
        { household_id: 'house_b', generation_kw: 1.20, consumption_kw: 4.00, battery_soc: null, source: 'SIMULATED' },
        { household_id: 'house_c', generation_kw: 3.50, consumption_kw: 2.20, battery_soc: 65.0, source: 'SIMULATED' },
        { household_id: 'house_d', generation_kw: 0.00, consumption_kw: 1.80, battery_soc: null, source: 'SIMULATED' },
        { household_id: 'house_e', generation_kw: 5.20, consumption_kw: 2.00, battery_soc: 90.0, source: 'SIMULATED' },
      ];

      for (const p of packets) {
        await api.postTelemetry(p);
      }

      // Update battery to 40%
      await api.patchBattery({ current_soc: 40.0, min_reserve: 20.0 });
      // Run optimization engine
      await api.runOptimization();

      setStatusMsg('✅ PPT Demo Scenario successfully published & matched! Check Dashboard.');
    } catch (err) {
      console.error(err);
      setStatusMsg(`❌ Error triggering PPT scenario: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Smart-Meter Telemetry Simulator</h2>
        <p className="text-xs text-gray-400">Inject high-fidelity synthetic telemetry packets or reproduce the hackathon demo state</p>
      </div>

      {/* PPT Demo Box */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-gray-900/80 to-gray-900 p-6 backdrop-blur-md">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Deterministic PPT Presentation Scenario</h3>
              <p className="text-xs text-emerald-300">Preset calibrated metrics matching presentation slide data</p>
            </div>
          </div>
          <button
            onClick={handleTriggerPPTDemo}
            disabled={isSending}
            className="flex items-center space-x-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-gray-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>{isSending ? 'Transmitting Scenario...' : 'Inject PPT Demo State'}</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 text-xs">
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <span className="text-gray-400">House A (Solar Node)</span>
            <div className="mt-1 font-bold text-amber-400">Gen: 6.8 kW | Con: 2.1 kW</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">Surplus: +4.7 kW</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <span className="text-gray-400">House B (Consumer)</span>
            <div className="mt-1 font-bold text-blue-400">Gen: 1.2 kW | Con: 4.0 kW</div>
            <div className="text-[11px] text-rose-400 font-semibold mt-0.5">Deficit: -2.8 kW</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <span className="text-gray-400">Community Battery</span>
            <div className="mt-1 font-bold text-teal-400">SOC: 40.0% (50 kWh)</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Min Reserve: 20%</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <span className="text-gray-400">Grid Tariff Benchmark</span>
            <div className="mt-1 font-bold text-white">Grid: ₹6.10/kWh</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">P2P Tariff: ₹4.50/kWh</div>
          </div>
        </div>

        {statusMsg && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/50 p-3 text-xs font-semibold text-emerald-300">
            {statusMsg}
          </div>
        )}
      </div>

      {/* Terminal CLI instructions */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
        <h3 className="text-base font-semibold text-white mb-2">CLI Simulator Commands</h3>
        <p className="text-xs text-gray-400 mb-4">Run these from your terminal to launch background telemetry workers:</p>
        <div className="space-y-2">
          <div className="rounded-xl bg-gray-950 p-3 font-mono text-xs text-emerald-400 border border-gray-800">
            python -m gridshare.simulator.run_simulator --mode live --interval 3.0
          </div>
          <div className="rounded-xl bg-gray-950 p-3 font-mono text-xs text-emerald-400 border border-gray-800">
            python -m gridshare.simulator.run_simulator --mode ppt
          </div>
        </div>
      </div>
    </div>
  );
}
