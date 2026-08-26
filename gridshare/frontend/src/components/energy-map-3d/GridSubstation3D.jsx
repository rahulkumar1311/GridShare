import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function GridSubstation3D({
  position = [0, 0, 0],
  gridPrice = 6.10,
  isSelected = false,
  onClick,
}) {
  const groupRef = useRef();
  const auraRef = useRef();

  useFrame(({ clock }) => {
    if (auraRef.current) {
      const t = clock.getElapsedTime();
      auraRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick('MAIN_UTILITY_GRID');
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Base Grid Aura */}
      <mesh ref={auraRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.6, 32]} />
        <meshBasicMaterial color="#334155" opacity={isSelected ? 0.9 : 0.45} transparent />
      </mesh>

      {/* Concrete Foundation Platform */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.0, 0.2, 2.0]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.8} />
      </mesh>

      {/* Main Substation Enclosure Box */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.0, 1.4]} />
        <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.4} />
      </mesh>

      {/* Cooling Fins / Transformer Vents */}
      <mesh position={[0, 0.7, 0.72]}>
        <boxGeometry args={[1.3, 0.7, 0.04]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* High-Voltage Bushings / Insulator Towers */}
      <mesh position={[-0.45, 1.4, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.6, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.2} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.6, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.2} roughness={0.3} />
      </mesh>
      <mesh position={[0.45, 1.4, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.6, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.2} roughness={0.3} />
      </mesh>

      {/* Floating 3D Micro-Label with bounded zIndexRange */}
      <Html
        position={[0, 2.2, 0]}
        center
        distanceFactor={13}
        zIndexRange={[10, 0]}
        className="pointer-events-none select-none transition-all duration-200"
      >
        <div className={`flex flex-col items-center rounded-lg border px-2 py-1 shadow-xs backdrop-blur-md bg-white/95 ${isSelected ? 'ring-1.5 ring-slate-800 border-slate-800' : 'border-slate-300'}`}>
          <span className="font-bold text-[10.5px] text-slate-900 tracking-tight whitespace-nowrap">
            Utility Substation
          </span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className="rounded bg-slate-100 border border-slate-300 px-1 py-0.2 text-[8.5px] font-bold font-mono text-slate-700">
              Grid Interconnect
            </span>
            <span className="font-mono text-[9.5px] font-bold text-slate-900">
              ₹{gridPrice.toFixed(2)}/kWh
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}
