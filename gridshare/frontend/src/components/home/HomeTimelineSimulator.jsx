import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Sun, Moon, Zap } from 'lucide-react';

export const TIMELINE_PRESETS = [
  { hour: 6, label: '06:00', title: 'Dawn / Solar Starts', solarEst: 0.8, loadEst: 1.4 },
  { hour: 9, label: '09:00', title: 'Morning PV Rise', solarEst: 3.5, loadEst: 1.8 },
  { hour: 12, label: '12:00', title: 'Solar Peak / Charging', solarEst: 4.8, loadEst: 2.6 },
  { hour: 15, label: '15:00', title: 'Afternoon Surplus', solarEst: 3.8, loadEst: 2.0 },
  { hour: 18, label: '18:00', title: 'Evening Demand Peak', solarEst: 1.0, loadEst: 3.8 },
  { hour: 21, label: '21:00', title: 'Night Battery Support', solarEst: 0.0, loadEst: 2.8 },
];

export default function HomeTimelineSimulator({
  currentHour = 12,
  isPlaying = false,
  onTogglePlay,
  onSelectHour,
  onResetTimeline,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2.5 border-b border-slate-100 mb-3 gap-2">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-purple-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            24-Hour Home Energy Simulation Timeline
          </h3>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onTogglePlay}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold transition shadow-xs ${
              isPlaying
                ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>PLAY DAY</span>
              </>
            )}
          </button>

          <button
            onClick={onResetTimeline}
            className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>RESET (12:00)</span>
          </button>
        </div>
      </div>

      {/* Interactive Time Slider */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 font-mono font-bold text-slate-800">
            {currentHour >= 6 && currentHour <= 18 ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-blue-500" />
            )}
            <span>Current Time: {String(Math.floor(currentHour)).padStart(2, '0')}:00</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {currentHour >= 6 && currentHour <= 18 ? 'Daytime PV Generation' : 'Nighttime Grid / Battery Mode'}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="23"
          step="1"
          value={Math.floor(currentHour)}
          onChange={(e) => onSelectHour(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />

        {/* 24-Hour Markers */}
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>00:00</span>
          <span>04:00</span>
          <span className="font-bold text-amber-600">08:00 (PV)</span>
          <span className="font-bold text-amber-600">12:00 (Peak)</span>
          <span className="font-bold text-amber-600">16:00</span>
          <span className="font-bold text-blue-600">20:00 (Peak Load)</span>
          <span>23:00</span>
        </div>
      </div>

      {/* Preset Quick-Jumps */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {TIMELINE_PRESETS.map((preset) => {
          const isSelected = Math.floor(currentHour) === preset.hour;
          return (
            <button
              key={preset.hour}
              onClick={() => onSelectHour(preset.hour)}
              className={`p-2 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-purple-500 bg-purple-50 text-purple-950 ring-1.5 ring-purple-500 font-bold'
                  : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="font-mono text-xs font-bold">{preset.label}</div>
              <div className="text-[10px] text-slate-500 truncate">{preset.title}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
