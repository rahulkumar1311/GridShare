import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Network,
  ShoppingBag,
  Cpu,
  Home,
  ReceiptText,
  Zap,
  Activity,
  ShieldCheck,
  Sliders
} from 'lucide-react';

export default function Sidebar({ isOnline = true }) {
  const primaryNav = [
    { name: 'Virtual Microgrid Demo', path: '/simulation', icon: Zap },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Community & Battery', path: '/community', icon: Users },
    { name: 'Live Energy Map', path: '/energy-map', icon: Network },
    { name: 'Routing Optimizer', path: '/optimize', icon: Sliders },
  ];

  const marketNav = [
    { name: 'P2P Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'AI & Forecasts', path: '/ai', icon: Cpu },
    { name: 'My Home Node', path: '/my-home', icon: Home },
    { name: 'Settlement Ledger', path: '/transactions', icon: ReceiptText },
  ];

  return (
    <aside className="w-60 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center space-x-2.5 px-4 py-3.5 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-extrabold tracking-tight text-slate-900">GridShare</span>
              <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-700 border border-emerald-200">
                PRO
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 font-medium leading-none mt-0.5">Community Microgrid OS</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="p-2.5 space-y-3">
          <div>
            <p className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
              Operations & Grid
            </p>
            <nav className="mt-0.5 space-y-0.5">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
              Marketplace & AI
            </p>
            <nav className="mt-0.5 space-y-0.5">
              {marketNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Cluster Footer Card */}
      <div className="p-2.5 m-2.5 rounded-xl border border-slate-200 bg-slate-50/80">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-bold text-slate-700">Cluster 101</span>
          <span className="flex items-center space-x-1 text-[10px] font-semibold">
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className={isOnline ? 'text-emerald-800 font-bold' : 'text-rose-600'}>
              {isOnline ? 'Synchronized' : 'Offline'}
            </span>
          </span>
        </div>
        <p className="text-[9.5px] text-slate-500 mt-0.5">Green Enclave • 5 Smart Meters</p>
      </div>
    </aside>
  );
}
