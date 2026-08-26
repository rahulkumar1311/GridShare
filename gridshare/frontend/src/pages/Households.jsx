import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Home, MapPin, Zap, RefreshCw } from 'lucide-react';

export default function Households() {
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHouseholds = async () => {
    try {
      const res = await api.getHouseholds();
      if (res.data?.status === 'SUCCESS') {
        setHouseholds(res.data.households);
      }
    } catch (err) {
      console.error('Error fetching households:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Community Households & Nodes</h2>
          <p className="text-xs text-gray-400">Registered microgrid participants and smart meter endpoints</p>
        </div>
        <button
          onClick={fetchHouseholds}
          className="flex items-center space-x-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {households.map((h) => (
          <div key={h.id} className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{h.name}</h4>
                  <span className="font-mono text-xs text-gray-400">ID: {h.id}</span>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                h.household_type === 'PROSUMER' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {h.household_type}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs text-gray-300">
              <div className="flex items-center space-x-2 text-gray-400">
                <MapPin className="h-3.5 w-3.5 text-gray-500" />
                <span>{h.location || 'Green Enclave Microgrid'}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                <span>Grid Price: ₹6.10/kWh | P2P Rate: ₹4.50/kWh</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
