import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function Battery3D({
  position = [0, 0, 0],
  soc = 40,
  capacityKwh = 50,
  isSelected = false,
  onClick,
}) {
  const groupRef = useRef();
  const liquidRef = useRef();
  const auraRef = useRef();

  useFrame(({ clock }) => {
    if (auraRef.current) {
      const t = clock.getElapsedTime();
      auraRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
    }
  });

  const normalizedSoc = Math.max(0, Math.min(100, soc));
  const fillHeight = (normalizedSoc / 100) * 1.35;

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick('COMMUNITY_BATTERY');
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Base Status Aura */}
      <mesh ref={auraRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.6, 32]} />
        <meshBasicMaterial color="#0d9488" opacity={isSelected ? 0.9 : 0.45} transparent />
      </mesh>

      {/* Concrete Foundation Plinth */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.5, 1.6, 0.2, 32]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>

      {/* Outer Transparent Glass/Metallic Battery Casing */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 0.95, 1.45, 32]} />
        <meshStandardMaterial
          color="#0f766e"
          roughness={0.1}
          metalness={0.1}
          opacity={0.3}
          transparent
        />
      </mesh>

      {/* Internal Metallic Cathode Column */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 1.4, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Dynamic Battery SOC Liquid Fill */}
      <mesh
        ref={liquidRef}
        position={[0, 0.18 + fillHeight / 2, 0]}
      >
        <cylinderGeometry args={[0.88, 0.88, fillHeight, 32]} />
        <meshStandardMaterial
          color={normalizedSoc < 25 ? '#f43f5e' : normalizedSoc < 60 ? '#0d9488' : '#059669'}
          roughness={0.2}
          metalness={0.3}
          opacity={0.85}
          transparent
        />
      </mesh>

      {/* Battery Terminal Caps */}
      <mesh position={[0, 1.68, 0]}>
        <cylinderGeometry args={[1.02, 1.02, 0.12, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.35, 1.78, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.14, 16]} />
        <meshStandardMaterial color="#ef4444" metalness={0.9} />
      </mesh>
      <mesh position={[0.35, 1.78, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.14, 16]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.9} />
      </mesh>

      {/* Floating 3D Compact Micro-Label with bounded zIndexRange */}
      <Html
        position={[0, 2.3, 0]}
        center
        distanceFactor={13}
        zIndexRange={[10, 0]}
        className="pointer-events-none select-none transition-all duration-200"
      >
        <div className={`flex flex-col items-center rounded-lg border px-2 py-1 shadow-xs backdrop-blur-md bg-white/95 ${isSelected ? 'ring-1.5 ring-teal-700 border-teal-700' : 'border-teal-200'}`}>
          <span className="font-bold text-[10.5px] text-slate-900 tracking-tight whitespace-nowrap">
            Community ESS
          </span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className="rounded bg-teal-50 border border-teal-200 px-1 py-0.2 text-[8.5px] font-bold font-mono text-teal-800">
              {normalizedSoc.toFixed(0)}% SOC
            </span>
            <span className="font-mono text-[9.5px] font-bold text-slate-500">
              ({((normalizedSoc / 100) * capacityKwh).toFixed(1)} kWh)
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}
