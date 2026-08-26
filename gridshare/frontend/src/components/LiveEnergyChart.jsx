import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function LiveEnergyChart({ history = [] }) {
  const chartData = history.length > 0 ? history.map((item, idx) => ({
    time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `T-${history.length - idx}`,
    generation: item.generation_kw,
    consumption: item.consumption_kw,
    net: item.net_balance_kw,
  })) : [
    { time: '06:00', generation: 0.8, consumption: 1.5, net: -0.7 },
    { time: '09:00', generation: 3.2, consumption: 2.8, net: 0.4 },
    { time: '12:00', generation: 6.8, consumption: 2.1, net: 4.7 },
    { time: '15:00', generation: 5.4, consumption: 2.4, net: 3.0 },
    { time: '18:00', generation: 1.2, consumption: 4.2, net: -3.0 },
    { time: '21:00', generation: 0.0, consumption: 3.6, net: -3.6 },
  ];

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Community Energy Generation vs Demand</h3>
          <p className="text-xs text-gray-400">24-hour diurnal profile and net balance curve (kW)</p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="text-gray-300">Solar Gen (kW)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-gray-300">Demand (kW)</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="time" stroke="#6b7280" fontSize={11} tickLine={false} />
            <YAxis stroke="#6b7280" fontSize={11} tickLine={false} unit=" kW" />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="generation" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#solarGrad)" name="Solar Gen (kW)" />
            <Area type="monotone" dataKey="consumption" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#demandGrad)" name="Demand (kW)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
