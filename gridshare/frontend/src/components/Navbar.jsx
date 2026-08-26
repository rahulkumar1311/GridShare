import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Activity, Home, Sliders, PlayCircle, ShieldCheck } from 'lucide-react';

export default function Navbar({ isOnline = true }) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Households', path: '/households', icon: Home },
    { name: 'Optimization & Rules', path: '/optimization', icon: Sliders },
    { name: 'Telemetry Simulator', path: '/simulator', icon: PlayCircle },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0b0f19]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg shadow-emerald-500/20">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tight text-white">GridShare</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                AI Microgrid
              </span>
            </div>
            <p className="text-xs text-gray-400">P2P Energy Trading & Telemetry</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status Pill */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 rounded-full border border-gray-700 bg-gray-800/80 px-3 py-1 text-xs">
            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-gray-300 font-medium">{isOnline ? 'Backend Connected' : 'Offline'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
