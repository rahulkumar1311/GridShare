import React from 'react';
import { Html } from '@react-three/drei';

export default function Readable3DLabel({
  position = [0, 0, 0],
  title,
  subtitle,
  value,
  unit = '',
  badge,
  badgeType = 'neutral',
  distanceFactor = 14,
  className = '',
}) {
  const badgeColors = {
    positive: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    negative: 'bg-rose-50 text-rose-800 border-rose-300',
    warning: 'bg-amber-50 text-amber-800 border-amber-300',
    info: 'bg-blue-50 text-blue-800 border-blue-300',
    neutral: 'bg-slate-100 text-slate-700 border-slate-300',
  }[badgeType] || 'bg-slate-100 text-slate-700 border-slate-300';

  return (
    <Html
      position={position}
      center
      distanceFactor={distanceFactor}
      className={`pointer-events-none select-none transition-all duration-150 ${className}`}
    >
      <div className="flex flex-col items-center rounded-lg border border-slate-200/90 bg-white/95 px-2 py-1 shadow-xs backdrop-blur-md">
        {title && (
          <span className="font-bold text-[10.5px] text-slate-900 tracking-tight whitespace-nowrap">
            {title}
          </span>
        )}
        <div className="flex items-center space-x-1 mt-0.5">
          {badge && (
            <span className={`rounded border px-1 py-0.2 text-[8.5px] font-bold font-mono ${badgeColors}`}>
              {badge}
            </span>
          )}
          {value !== undefined && (
            <span className="font-mono font-bold text-[10px] text-slate-900">
              {value} {unit}
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-[8.5px] font-medium text-slate-500 mt-0.5 whitespace-nowrap">
            {subtitle}
          </span>
        )}
      </div>
    </Html>
  );
}
