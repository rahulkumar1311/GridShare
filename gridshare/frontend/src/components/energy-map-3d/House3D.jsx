import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function House3D({
  id,
  name,
  position = [0, 0, 0],
  status = 'BALANCED',
  generationKw = 0,
  consumptionKw = 0,
  netKw = 0,
  isSelected = false,
  hasSolar = true,
  onClick,
}) {
  const groupRef = useRef();
  const auraRef = useRef();

  useFrame(({ clock }) => {
    if (auraRef.current && isSelected) {
      const t = clock.getElapsedTime();
      auraRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    }
  });

  const isSurplus = status === 'SURPLUS';
  const isDeficit = status === 'DEFICIT';

  // Base colors
  const statusColor = isSurplus ? '#059669' : isDeficit ? '#e11d48' : '#64748b';
  const statusBg = isSurplus ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : isDeficit ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-700 border-slate-300';
  const wallColor = isSelected ? '#ffffff' : '#f8fafc';
  const roofColor = hasSolar ? '#0f172a' : '#475569';

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Selection / Status Base Ring */}
      <mesh ref={auraRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.35, 32]} />
        <meshBasicMaterial color={statusColor} opacity={isSelected ? 0.9 : 0.45} transparent />
      </mesh>

      {/* House Plinth / Base Foundation */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.8, 0.16, 1.6]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
      </mesh>

      {/* Building Body */}
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.0, 1.3]} />
        <meshStandardMaterial color={wallColor} roughness={0.3} metalness={0.05} />
      </mesh>

      {/* Modern Gable Roof */}
      <mesh position={[0, 1.45, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.3, 0.7, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.4} />
      </mesh>

      {/* Solar Panel Layer on Roof (if prosumer) */}
      {hasSolar && (
        <group position={[0, 1.35, 0.35]} rotation={[-0.45, 0, 0]}>
          <mesh>
            <boxGeometry args={[1.0, 0.04, 0.65]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.2} metalness={0.8} />
          </mesh>
          {/* Solar Panel grid lines */}
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.96, 0.01, 0.6]} />
            <meshStandardMaterial color="#3b82f6" opacity={0.6} transparent roughness={0.1} />
          </mesh>
        </group>
      )}

      {/* Minimalist Door & Window accents */}
      <mesh position={[0, 0.45, 0.66]}>
        <boxGeometry args={[0.35, 0.6, 0.02]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
      <mesh position={[0.42, 0.65, 0.66]}>
        <boxGeometry args={[0.32, 0.32, 0.02]} />
        <meshStandardMaterial color="#93c5fd" roughness={0.2} metalness={0.4} />
      </mesh>

      {/* Floating 3D Micro-Label with bounded zIndexRange */}
      <Html
        position={[0, 2.2, 0]}
        center
        distanceFactor={13}
        zIndexRange={[10, 0]}
        className="pointer-events-none select-none transition-all duration-200"
      >
        <div className={`flex flex-col items-center rounded-lg border px-2 py-1 shadow-xs backdrop-blur-md bg-white/95 ${isSelected ? 'ring-1.5 ring-slate-900 border-slate-900' : 'border-slate-200'}`}>
          <span className="font-bold text-[10.5px] text-slate-900 tracking-tight whitespace-nowrap">
            {name || id}
          </span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className={`rounded border px-1 py-0.2 text-[8.5px] font-bold font-mono ${statusBg}`}>
              {status}
            </span>
            <span className={`font-mono font-bold text-[10px] ${isSurplus ? 'text-emerald-700' : isDeficit ? 'text-rose-600' : 'text-slate-600'}`}>
              {isSurplus ? `+${netKw.toFixed(1)}` : netKw.toFixed(1)} kW
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}
