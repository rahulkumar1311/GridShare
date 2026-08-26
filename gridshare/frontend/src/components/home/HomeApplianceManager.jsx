import React from 'react';
import {
  Tv,
  Utensils,
  Wind,
  Refrigerator,
  Shirt,
  Power,
  Zap,
  Sliders
} from 'lucide-react';

export const APPLIANCE_DEFAULTS = [
  {
    id: 'livingRoom',
    name: 'Living Room & TV',
    powerKw: 0.4,
    icon: Tv,
    zone: 'Ground Floor',
    description: 'Smart LED ambient lights & OLED TV',
  },
  {
    id: 'kitchen',
    name: 'Kitchen & Induction',
    powerKw: 0.8,
    icon: Utensils,
    zone: 'Ground Floor',
    description: 'Induction hob, microwave & ventilation',
  },
  {
    id: 'ac',
    name: 'Air Conditioner (AC)',
    powerKw: 1.2,
    icon: Wind,
    zone: 'Master Bedroom',
    description: 'Inverter Dual-Cool Heat Pump HVAC',
  },
  {
    id: 'fridge',
    name: 'Smart Refrigerator',
    powerKw: 0.2,
    icon: Refrigerator,
    zone: 'Kitchen Area',
    description: 'Continuous Eco-Inverter Compressor',
  },
  {
    id: 'washingMachine',
    name: 'Smart Washing Machine',
    powerKw: 0.3,
    icon: Shirt,
    zone: 'Utility Room',
    description: 'Scheduled Eco-Drum Wash Cycle',
  },
];

export default function HomeApplianceManager({
  appliances = {
    ac: true,
    fridge: true,
    livingRoom: true,
    kitchen: true,
    washingMachine: false,
  },
  onToggleAppliance,
  totalDemandKw = 2.6,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
        <div className="flex items-center space-x-2">
          <Power className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Household Appliances & Active Loads
          </h3>
        </div>
        <div className="flex items-center space-x-1.5 font-mono text-xs font-bold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
          <span>Total Load:</span>
          <span>{totalDemandKw.toFixed(2)} kW</span>
        </div>
      </div>

      <div className="space-y-2">
        {APPLIANCE_DEFAULTS.map((app) => {
          const Icon = app.icon;
          const isOn = !!appliances[app.id];

          return (
            <div
              key={app.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                isOn
                  ? 'border-blue-200 bg-blue-50/40'
                  : 'border-slate-200 bg-slate-50/50 opacity-70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isOn ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-800">{app.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({app.zone})</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500">{app.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold text-slate-700">
                  {app.powerKw.toFixed(1)} kW
                </span>

                {/* Interactive ON / OFF Toggle Switch */}
                <button
                  type="button"
                  onClick={() => onToggleAppliance(app.id)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isOn ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  aria-label={`Toggle ${app.name}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isOn ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
        <span>💡 Toggling appliances updates 3D house lighting, load & energy flows in real time.</span>
      </div>
    </div>
  );
}
