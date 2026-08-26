import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import CameraControls from './CameraControls';

function ChargeParticles({ count = 12, isCharging = true }) {
  const pointsRef = useRef();

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3 + 1; // Y axis
      if (isCharging) {
        positions[idx] += delta * 0.7;
        if (positions[idx] > 1.8) positions[idx] = 0.2;
      } else {
        positions[idx] -= delta * 0.7;
        if (positions[idx] < 0.2) positions[idx] = 1.8;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const particlePositions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 0.82;
    particlePositions[i * 3] = Math.cos(angle) * radius;
    particlePositions[i * 3 + 1] = (i / count) * 1.6 + 0.2;
    particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particlePositions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={isCharging ? '#059669' : '#0284c7'}
        size={0.16}
        transparent
        opacity={0.8}
      />
    </points>
  );
}

function BatteryCylinderScene({ soc = 40, capacityKwh = 50, isCharging = true }) {
  const liquidRef = useRef();
  const normalizedSoc = Math.max(0, Math.min(100, soc));
  const fillHeight = Math.max(0.1, (normalizedSoc / 100) * 1.8);

  useFrame(() => {
    if (liquidRef.current) {
      liquidRef.current.scale.y += (fillHeight - liquidRef.current.scale.y) * 0.1;
      liquidRef.current.position.y = 0.1 + liquidRef.current.scale.y / 2;
    }
  });

  return (
    <group position={[0, -0.9, 0]}>
      {/* Plinth Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.3, 1.4, 0.1, 32]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
      </mesh>

      {/* Outer Transparent Glass Container */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 1.85, 32]} />
        <meshStandardMaterial
          color="#0f766e"
          roughness={0.1}
          metalness={0.1}
          opacity={0.22}
          transparent
        />
      </mesh>

      {/* Internal Charge Fill Cylinder */}
      <mesh
        ref={liquidRef}
        position={[0, 0.1 + fillHeight / 2, 0]}
        scale={[1, fillHeight, 1]}
      >
        <cylinderGeometry args={[0.98, 0.98, 1, 32]} />
        <meshStandardMaterial
          color={normalizedSoc < 25 ? '#f43f5e' : normalizedSoc < 60 ? '#0d9488' : '#059669'}
          roughness={0.2}
          metalness={0.25}
          opacity={0.88}
          transparent
        />
      </mesh>

      {/* Safety Reserve Floor (20%) Ring */}
      <mesh position={[0, 0.1 + (0.2 * 1.8), 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.97, 1.04, 32]} />
        <meshBasicMaterial color="#ef4444" opacity={0.65} transparent />
      </mesh>

      {/* Top Cap */}
      <mesh position={[0, 1.95, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 0.1, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>

      {/* Floating Anode / Cathode */}
      <mesh position={[-0.35, 2.05, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
        <meshStandardMaterial color="#ef4444" metalness={0.9} />
      </mesh>
      <mesh position={[0.35, 2.05, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.9} />
      </mesh>

      <ChargeParticles count={14} isCharging={isCharging} />

      {/* Floating 3D Micro-Label */}
      <Html position={[0, 2.45, 0]} center distanceFactor={13} className="pointer-events-none select-none">
        <div className="flex flex-col items-center rounded-lg border border-teal-200 bg-white/95 px-2.5 py-1 shadow-xs backdrop-blur-md">
          <span className="font-bold text-[10.5px] text-slate-900 tracking-tight">
            Central Storage
          </span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className="rounded bg-teal-50 border border-teal-200 px-1 py-0.2 text-[8.5px] font-bold font-mono text-teal-800">
              {normalizedSoc.toFixed(0)}% SOC
            </span>
            <span className="font-mono text-[9.5px] font-bold text-slate-600">
              ({((normalizedSoc / 100) * capacityKwh).toFixed(1)} kWh)
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

export default function BatteryChart3D({ soc = 40, capacityKwh = 50, isCharging = true }) {
  return (
    <div className="relative h-56 w-full rounded-xl border border-slate-200/90 bg-slate-50/40 p-2 shadow-xs overflow-hidden select-none">
      <Canvas camera={{ position: [0, 2.5, 6], fov: 38 }} shadows>
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 8, 6]} intensity={1.1} castShadow />
        <directionalLight position={[-6, 6, -4]} intensity={0.4} />

        <CameraControls preset="battery" />
        <BatteryCylinderScene soc={soc} capacityKwh={capacityKwh} isCharging={isCharging} />
      </Canvas>
    </div>
  );
}
