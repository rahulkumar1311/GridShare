import React, { useState } from 'react';
import {
  BatteryCharging,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function HomeBatteryManager({
  capacity = 10.0,
  soc = 68,
  reservePercent = 20,
  chargeKw = 0,
  dischargeKw = 0,
  status = 'IDLE',
  onChargeBattery,
  onDischargeBattery,
  onChangeReserve,
}) {
  const [chargeAmount, setChargeAmount] = useState('1.5');
  const [dischargeAmount, setDischargeAmount] = useState('1.0');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const storedKwh = (capacity * soc) / 100;
  const reserveKwh = (capacity * reservePercent) / 100;
  const usableKwh = Math.max(0, storedKwh - reserveKwh);

  const handleManualCharge = () => {
    setErrorMsg('');
    setSuccessMsg('');
    const amt = parseFloat(chargeAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid positive charge amount.');
      return;
    }
    const maxCanCharge = capacity - storedKwh;
    if (amt > maxCanCharge + 0.001) {
      setErrorMsg(`Cannot charge ${amt.toFixed(1)} kWh. Battery capacity is capped at ${capacity.toFixed(1)} kWh (Room: ${maxCanCharge.toFixed(1)} kWh).`);
      return;
    }

    onChargeBattery(amt);
    setSuccessMsg(`Successfully queued +${amt.toFixed(1)} kWh charge into Home Battery.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleManualDischarge = () => {
    setErrorMsg('');
    setSuccessMsg('');
    const amt = parseFloat(dischargeAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid positive discharge amount.');
      return;
    }

    const availableAboveReserve = storedKwh - reserveKwh;
    if (amt > availableAboveReserve + 0.001) {
      setErrorMsg(`Battery reserve limit reached. Cannot discharge below configured reserve of ${reservePercent}% (${reserveKwh.toFixed(1)} kWh). Usable: ${usableKwh.toFixed(1)} kWh.`);
      return;
    }

    onDischargeBattery(amt);
    setSuccessMsg(`Successfully discharged ${amt.toFixed(1)} kWh from Home Battery to supply home demand.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
        <div className="flex items-center space-x-2">
          <BatteryCharging className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Home Energy Storage System (ESS)
          </h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold font-mono ${
            status === 'CHARGING'
              ? 'bg-emerald-100 text-emerald-800'
              : status === 'DISCHARGING'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Main SOC & Capacity Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium">Capacity</span>
          <div className="font-mono text-sm font-bold text-slate-800 mt-0.5">{capacity.toFixed(1)} kWh</div>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium">State of Charge (SOC)</span>
          <div className="font-mono text-sm font-bold text-emerald-700 mt-0.5">{soc.toFixed(1)}%</div>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium">Stored Energy</span>
          <div className="font-mono text-sm font-bold text-slate-800 mt-0.5">{storedKwh.toFixed(2)} kWh</div>
        </div>

        <div className="rounded-lg bg-emerald-50/60 p-2.5 border border-emerald-200">
          <span className="text-[11px] text-emerald-800 font-bold">Usable Energy</span>
          <div className="font-mono text-sm font-bold text-emerald-900 mt-0.5">{usableKwh.toFixed(2)} kWh</div>
        </div>
      </div>

      {/* Battery State Visual Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
          <span>Charge Level</span>
          <span className="font-mono font-bold text-slate-700">
            {storedKwh.toFixed(1)} / {capacity.toFixed(1)} kWh ({soc.toFixed(0)}%)
          </span>
        </div>
        <div className="relative h-3 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-300 ${
              soc > 40 ? 'bg-emerald-500' : soc > 20 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
          />
          {/* Reserve Marker Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-600 z-10"
            style={{ left: `${reservePercent}%` }}
            title={`Reserve Threshold: ${reservePercent}%`}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>0%</span>
          <span className="text-rose-600 font-bold">Reserve Guard: {reservePercent}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Reserve Configuration Slider */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            <span>Emergency Reserve Protection:</span>
          </div>
          <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            {reservePercent}% ({reserveKwh.toFixed(1)} kWh)
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="50"
          step="5"
          value={reservePercent}
          onChange={(e) => onChangeReserve(parseInt(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
        />
        <div className="flex items-center space-x-1 mt-1 text-[10.5px] text-slate-500 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>RESERVE PROTECTED ✓ (Discharge will stop automatically at {reservePercent}%)</span>
        </div>
      </div>

      {/* Manual Charge & Discharge Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        {/* Charge Column */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-700 block">Manual Charge (kWh):</label>
          <div className="flex space-x-2">
            <input
              type="number"
              step="0.5"
              min="0.1"
              max={capacity}
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-emerald-500"
            />
            <button
              onClick={handleManualCharge}
              className="flex items-center justify-center space-x-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs whitespace-nowrap"
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>Charge</span>
            </button>
          </div>
        </div>

        {/* Discharge Column */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-700 block">Manual Discharge (kWh):</label>
          <div className="flex space-x-2">
            <input
              type="number"
              step="0.5"
              min="0.1"
              max={capacity}
              value={dischargeAmount}
              onChange={(e) => setDischargeAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-amber-500"
            />
            <button
              onClick={handleManualDischarge}
              className="flex items-center justify-center space-x-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-xs whitespace-nowrap"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Discharge</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error or Success Feedback Alert */}
      {errorMsg && (
        <div className="mt-3 flex items-start space-x-2 rounded-lg bg-rose-50 p-2.5 border border-rose-200 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-3 flex items-start space-x-2 rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}
    </div>
  );
}
