import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Zap,
  LayoutDashboard,
  Users,
  Network,
  ShoppingBag,
  Cpu,
  Home,
  ReceiptText,
  Sliders,
  RefreshCw,
  Sparkles,
  IndianRupee,
  BatteryCharging,
  Play,
  Menu,
  X
} from 'lucide-react';

export default function TopNavbar({
  isOnline = true,
  batterySoc = 40,
  gridPrice = 6.10,
  onRefresh,
  isRefreshing = false,
  onOpenDemoModal,
  onTriggerOptimization,
  isOptimizing = false,
}) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Microgrid 3D', path: '/simulation', icon: Zap, highlight: true },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Energy Map', path: '/energy-map', icon: Network },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'Battery', path: '/battery', icon: BatteryCharging },
    { name: 'Optimizer', path: '/optimize', icon: Sliders },
    { name: 'AI & Forecasts', path: '/ai', icon: Cpu },
    { name: 'My Home', path: '/my-home', icon: Home },
    { name: 'Ledger', path: '/transactions', icon: ReceiptText },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs select-none">
      <div className="mx-auto flex h-12 max-w-[1680px] items-center justify-between px-3 sm:px-4">
        {/* Brand Logo & Cluster status */}
        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <NavLink to="/simulation" className="flex items-center space-x-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs group-hover:bg-emerald-700 transition">
              <Zap className="h-4 w-4" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-black tracking-tight text-slate-900">
                GRID<span className="text-emerald-600">SHARE</span>
              </span>
              <span className="hidden sm:inline-block rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                P2P MICROGRID
              </span>
            </div>
          </NavLink>

          <div className="hidden xl:flex items-center space-x-1 border-l border-slate-200 pl-2.5 text-[10.5px]">
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-500 font-medium font-mono">Cluster 101</span>
          </div>
        </div>

        {/* Horizontal Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-1 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isMatch = location.pathname === item.path || (item.path === '/simulation' && location.pathname === '/');

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={
                  `flex items-center space-x-1.5 rounded-lg px-2 xl:px-2.5 py-1 text-[11.5px] font-bold transition-all whitespace-nowrap ${
                    isMatch
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  } ${item.highlight && !isMatch ? 'text-emerald-700 font-extrabold' : ''}`
                }
              >
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isMatch ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Utility Badges & Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Battery Status Tag */}
          <div className="hidden md:flex items-center space-x-1 rounded-lg border border-teal-200 bg-teal-50/70 px-2 py-0.8 text-[11px] font-mono">
            <BatteryCharging className="h-3 w-3 text-teal-600" />
            <span className="font-bold text-teal-900">{batterySoc.toFixed(0)}%</span>
          </div>

          {/* Grid Benchmark */}
          <div className="hidden xl:flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.8 text-[11px] font-mono">
            <IndianRupee className="h-2.5 w-2.5 text-slate-500" />
            <span className="text-slate-500 font-sans text-[10px]">Grid:</span>
            <span className="font-bold text-slate-900">₹{gridPrice.toFixed(2)}</span>
          </div>

          {/* Sync Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
              title="Refresh telemetry"
            >
              <RefreshCw className={`h-3 w-3 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-[10.5px]">Sync</span>
            </button>
          )}

          {/* Demo Mode Button */}
          {onOpenDemoModal && (
            <button
              onClick={onOpenDemoModal}
              className="flex items-center space-x-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 text-[11px] font-bold shadow-xs transition active:scale-95 border border-amber-600"
              title="Open Demo Scenarios"
            >
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">Scenarios</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-2 space-y-1 shadow-lg animate-in slide-in-from-top duration-150">
          <div className="grid grid-cols-2 gap-1.5 py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isMatch = location.pathname === item.path || (item.path === '/simulation' && location.pathname === '/');

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 rounded-lg px-2.5 py-2 text-xs font-bold transition ${
                    isMatch
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isMatch ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
