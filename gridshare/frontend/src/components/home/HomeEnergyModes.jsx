import React from 'react';
import { Cpu, ShieldCheck, Zap, BatteryCharging, ShoppingBag, Radio } from 'lucide-react';

export const ENERGY_MODES = [
  {
    id: 'AUTO',
    name: 'AUTO',
    icon: Cpu,
    color: 'emerald',
    description: 'Solar → Home Load → Home Battery → P2P → Grid Export',
    details: 'AI balanced routing prioritizing home self-reliance, local battery storage, and peer marketplace trading before grid export.',
  },
  {
    id: 'SELF_USE',
    name: 'SELF USE',
    icon: ShieldCheck,
    color: 'blue',
    description: 'Solar → Home Load → Home Battery',
    details: 'Maximizes on-site solar consumption and battery charging. Never exports or sells until battery is at 100% capacity.',
  },
  {
    id: 'BATTERY_FIRST',
    name: 'BATTERY FIRST',
    icon: BatteryCharging,
    color: 'teal',
    description: 'Solar → Home Battery (Target 100%)',
    details: 'Channels maximum solar generation to rapidly charge the home battery to ensure storm or peak-tariff resiliency.',
  },
  {
    id: 'SELL_SURPLUS',
    name: 'SELL SURPLUS',
    icon: ShoppingBag,
    color: 'amber',
    description: 'Solar → Home Load → P2P Marketplace',
    details: 'Aggressively lists excess rooftop energy on the P2P marketplace at ₹4.50/kWh to maximize prosumer earnings.',
  },
  {
    id: 'GRID_BACKUP',
    name: 'GRID BACKUP',
    icon: Radio,
    color: 'purple',
    description: 'Keep Battery Reserved • Grid Standby',
    details: 'Maintains home battery in full reserve for critical backup while utilizing grid energy during low tariff windows.',
  },
];

export default function HomeEnergyModes({ activeMode, onSelectMode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Energy Management Mode
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold font-mono text-slate-700">
          MODE: {activeMode.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {ENERGY_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;

          const activeBorder =
            mode.color === 'emerald'
              ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-1.5 ring-emerald-500'
              : mode.color === 'blue'
              ? 'border-blue-500 bg-blue-50/80 text-blue-950 ring-1.5 ring-blue-500'
              : mode.color === 'teal'
              ? 'border-teal-500 bg-teal-50/80 text-teal-950 ring-1.5 ring-teal-500'
              : mode.color === 'amber'
              ? 'border-amber-500 bg-amber-50/80 text-amber-950 ring-1.5 ring-amber-500'
              : 'border-purple-500 bg-purple-50/80 text-purple-950 ring-1.5 ring-purple-500';

          const iconColor =
            mode.color === 'emerald'
              ? 'text-emerald-600'
              : mode.color === 'blue'
              ? 'text-blue-600'
              : mode.color === 'teal'
              ? 'text-teal-600'
              : mode.color === 'amber'
              ? 'text-amber-600'
              : 'text-purple-600';

          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all duration-150 ${
                isActive
                  ? activeBorder
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 w-full justify-between mb-1">
                <Icon className={`h-4 w-4 ${isActive ? iconColor : 'text-slate-500'}`} />
                <span className="font-bold text-[11px] tracking-tight">{mode.name}</span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1 leading-tight">
                {mode.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Mode Summary Line */}
      <div className="mt-2.5 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 flex items-center justify-between">
        <span className="font-medium">
          {ENERGY_MODES.find((m) => m.id === activeMode)?.details}
        </span>
      </div>
    </div>
  );
}
