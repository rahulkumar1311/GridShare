import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import CameraControls from './CameraControls';

function ColumnTimelineBar({ position, height, color, isForecast = false, uncertainty = 0 }) {
  const normHeight = Math.max(0.15, height);

  return (
    <group position={position}>
      <mesh position={[0, normHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.38, normHeight, 0.38]} />
        <meshStandardMaterial
          color={color}
          transparent={isForecast}
          opacity={isForecast ? 0.75 : 0.95}
          roughness={0.25}
        />
      </mesh>

      {/* Uncertainty Error Bracket for ML Forecast */}
      {isForecast && uncertainty > 0 && (
        <mesh position={[0, normHeight + (uncertainty * 1.5) / 2, 0]}>
          <boxGeometry args={[0.42, uncertainty * 1.5, 0.42]} />
          <meshStandardMaterial color="#c084fc" transparent opacity={0.25} wireframe />
        </mesh>
      )}
    </group>
  );
}

export default function PredictionChart3D({
  historicalData = [],
  forecastData = [],
}) {
  const defaultHist = historicalData.length > 0 ? historicalData : [
    { time: '-3h', val: 2.1 },
    { time: '-2h', val: 2.4 },
    { time: '-1h', val: 2.3 },
  ];

  const defaultForecast = forecastData.length > 0 ? forecastData : [
    { time: '+1h', val: 2.68, unc: 0.15 },
    { time: '+2h', val: 3.10, unc: 0.20 },
    { time: '+3h', val: 3.45, unc: 0.25 },
  ];

  return (
    <div className="relative h-60 w-full rounded-xl border border-slate-200/90 bg-slate-50/40 p-2 shadow-xs overflow-hidden select-none">
      {/* Top Legend */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center space-x-2.5 rounded-lg border border-slate-200 bg-white/95 px-2 py-0.8 shadow-xs backdrop-blur-md">
        <div className="flex items-center space-x-1">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          <span className="text-[10px] font-bold text-slate-700">Observed History</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="h-2 w-2 rounded-full bg-purple-600" />
          <span className="text-[10px] font-bold text-slate-700">ML Forecast (+Uncertainty)</span>
        </div>
      </div>

      <Canvas camera={{ position: [0, 4.5, 7.5], fov: 36 }} shadows>
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 10, 6]} intensity={1.1} castShadow />
        <directionalLight position={[-6, 6, -4]} intensity={0.4} />

        <CameraControls preset="chart" enableZoom={false} />

        <group position={[0, -0.9, 0]}>
          <gridHelper args={[14, 14, '#e2e8f0', '#f1f5f9']} position={[0, 0, 0]} />

          {/* Historical Columns */}
          {defaultHist.map((h, i) => {
            const x = (i - defaultHist.length) * 0.85 - 0.2;
            const hgt = Math.max(0.2, (h.val / 5) * 2.2);
            return (
              <group key={h.time || i}>
                <ColumnTimelineBar position={[x, 0, 0]} height={hgt} color="#2563eb" />
                <Html position={[x, -0.2, 0]} center distanceFactor={12} className="pointer-events-none select-none">
                  <span className="font-mono text-[8.5px] font-bold text-slate-500">{h.time}</span>
                </Html>
              </group>
            );
          })}

          {/* NOW Vertical Divider Marker */}
          <group position={[0, 0, 0]}>
            <mesh position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 2.4, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            <Html position={[0, 2.55, 0]} center distanceFactor={12} className="pointer-events-none select-none">
              <span className="rounded bg-rose-600 px-1 py-0.2 text-[8px] font-bold font-mono text-white shadow-xs">
                NOW
              </span>
            </Html>
          </group>

          {/* ML Forecast Columns */}
          {defaultForecast.map((f, i) => {
            const x = (i + 1) * 0.85;
            const hgt = Math.max(0.2, (f.val / 5) * 2.2);
            return (
              <group key={f.time || i}>
                <ColumnTimelineBar position={[x, 0, 0]} height={hgt} color="#9333ea" isForecast={true} uncertainty={f.unc || 0.15} />
                <Html position={[x, -0.2, 0]} center distanceFactor={12} className="pointer-events-none select-none">
                  <span className="font-mono text-[8.5px] font-bold text-purple-700">{f.time}</span>
                </Html>
              </group>
            );
          })}
        </group>
      </Canvas>
    </div>
  );
}
