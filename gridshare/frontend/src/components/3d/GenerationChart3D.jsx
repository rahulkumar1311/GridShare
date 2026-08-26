import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import CameraControls from './CameraControls';
import { RotateCcw } from 'lucide-react';

function Bar3D({ position, height, color, label, val, isHovered, onHover, onUnhover }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      const targetScaleY = Math.max(0.1, height);
      meshRef.current.scale.y += (targetScaleY - meshRef.current.scale.y) * 0.12;
      meshRef.current.position.y = meshRef.current.scale.y / 2;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        scale={[1, height, 1]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover();
        }}
        onPointerOut={() => onUnhover()}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.38, 1, 0.38]} />
        <meshStandardMaterial
          color={isHovered ? '#ffffff' : color}
          roughness={0.2}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}

function GenerationScene({ data = [], hoveredPoint, setHoveredPoint }) {
  const maxKw = Math.max(...data.flatMap((d) => [d.generation || 0, d.consumption || 0]), 8);

  return (
    <group position={[-(data.length * 0.95) / 2 + 0.5, -1.0, 0]}>
      <gridHelper
        args={[data.length * 1.3, data.length, '#e2e8f0', '#f1f5f9']}
        position={[(data.length * 0.95) / 2, 0, 0]}
      />

      {data.map((item, idx) => {
        const x = idx * 0.95;
        const genHeight = Math.max(0.1, ((item.generation || 0) / maxKw) * 2.2);
        const conHeight = Math.max(0.1, ((item.consumption || 0) / maxKw) * 2.2);
        const isThisHovered = hoveredPoint?.idx === idx;

        return (
          <group key={item.time || idx}>
            <Bar3D
              position={[x - 0.22, 0, 0]}
              height={genHeight}
              color="#d97706"
              label="Solar PV"
              val={item.generation}
              isHovered={isThisHovered}
              onHover={() => setHoveredPoint({ ...item, idx })}
              onUnhover={() => setHoveredPoint(null)}
            />

            <Bar3D
              position={[x + 0.22, 0, 0]}
              height={conHeight}
              color="#2563eb"
              label="Demand"
              val={item.consumption}
              isHovered={isThisHovered}
              onHover={() => setHoveredPoint({ ...item, idx })}
              onUnhover={() => setHoveredPoint(null)}
            />

            <Html position={[x, -0.2, 0]} center distanceFactor={13} className="pointer-events-none select-none">
              <span className="font-mono text-[9px] font-bold text-slate-500 whitespace-nowrap">
                {item.time}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default function GenerationChart3D({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [cameraPreset, setCameraPreset] = useState('chart');

  const defaultData = data.length > 0 ? data : [
    { time: '06:00', generation: 0.8, consumption: 1.5 },
    { time: '09:00', generation: 3.2, consumption: 2.8 },
    { time: '12:00', generation: 6.8, consumption: 2.1 },
    { time: '15:00', generation: 5.4, consumption: 2.4 },
    { time: '18:00', generation: 1.2, consumption: 4.2 },
    { time: '21:00', generation: 0.0, consumption: 3.6 },
  ];

  return (
    <div className="relative h-56 w-full rounded-xl border border-slate-200/90 bg-slate-50/40 p-2 shadow-xs overflow-hidden select-none">
      {/* Legend Overlay */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center space-x-2.5 rounded-lg border border-slate-200 bg-white/95 px-2 py-0.8 shadow-xs backdrop-blur-md">
        <div className="flex items-center space-x-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-[10px] font-bold text-slate-700">Solar Gen</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          <span className="text-[10px] font-bold text-slate-700">Demand</span>
        </div>
      </div>

      <div className="absolute top-2.5 right-2.5 z-10 flex items-center space-x-1">
        <button
          onClick={() => setCameraPreset(prev => prev === 'default' ? 'side' : 'default')}
          className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white/95 px-2 py-0.8 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-xs"
        >
          <RotateCcw className="h-2.5 w-2.5 text-slate-500" />
          <span>Angle</span>
        </button>
      </div>

      <Canvas camera={{ position: [0, 4.5, 7.5], fov: 38 }} shadows>
        <ambientLight intensity={0.8} />
        <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow />
        <directionalLight position={[-8, 6, -6]} intensity={0.4} />

        <CameraControls preset={cameraPreset} />

        <GenerationScene
          data={defaultData}
          hoveredPoint={hoveredPoint}
          setHoveredPoint={setHoveredPoint}
        />
      </Canvas>

      {hoveredPoint && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 rounded-lg border border-slate-200 bg-white/95 px-3 py-1 shadow-md backdrop-blur-md text-[10.5px]">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-slate-900 font-mono">{hoveredPoint.time}</span>
            <div className="flex items-center space-x-1">
              <span className="text-slate-500 text-[10px]">Gen:</span>
              <span className="font-mono font-bold text-amber-600">{hoveredPoint.generation?.toFixed(2)} kW</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-slate-500 text-[10px]">Load:</span>
              <span className="font-mono font-bold text-blue-600">{hoveredPoint.consumption?.toFixed(2)} kW</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-slate-500 text-[10px]">Net:</span>
              <span className={`font-mono font-bold ${(hoveredPoint.generation - hoveredPoint.consumption) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {((hoveredPoint.generation || 0) - (hoveredPoint.consumption || 0)).toFixed(2)} kW
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
