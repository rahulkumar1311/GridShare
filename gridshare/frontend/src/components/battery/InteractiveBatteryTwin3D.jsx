import React, { useRef, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// Coordinates for source/destination nodes around the central battery
export const BATTERY_VIEW_POSITIONS = {
  COMMUNITY_BATTERY: [0, 0, 0],
  house_a: [-4.2, 0, 1.2],
  house_b: [4.2, 0, 1.2],
  house_c: [-2.4, 0, -3.2],
  MAIN_UTILITY_GRID: [2.4, 0, -3.2],
  SOLAR_ARRAY: [-4.2, 3.5, 1.2],
};

/**
 * 🔋 Detailed Community Battery ESS Enclosure with Stacked Modules
 */
function IndustrialBatteryCabinet3D({
  soc = 60,
  capacity = 20,
  storedEnergy = 12,
  status = 'IDLE', // 'IDLE', 'CHARGING', 'DISCHARGING', 'FULL', 'EMPTY'
  selectedModule = null,
  onSelectModule,
}) {
  const liquidRef = useRef();
  const auraRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (auraRef.current) {
      const pulseSpeed = status === 'CHARGING' || status === 'DISCHARGING' ? 4 : 1.5;
      auraRef.current.scale.setScalar(1 + Math.sin(t * pulseSpeed) * 0.04);
    }
  });

  const normalizedSoc = Math.max(0, Math.min(100, soc));
  const fillHeight = (normalizedSoc / 100) * 1.8;

  // 4 modular cell racks
  const modules = [
    { id: 1, name: 'Rack Module 01', y: 0.35, voltage: 48.2, temp: 27.4, soc: Math.min(100, normalizedSoc + 1) },
    { id: 2, name: 'Rack Module 02', y: 0.85, voltage: 48.0, temp: 28.1, soc: normalizedSoc },
    { id: 3, name: 'Rack Module 03', y: 1.35, voltage: 47.9, temp: 27.8, soc: Math.max(0, normalizedSoc - 1) },
    { id: 4, name: 'Rack Module 04', y: 1.85, voltage: 48.1, temp: 28.3, soc: normalizedSoc },
  ];

  const statusColor =
    status === 'CHARGING'
      ? '#059669'
      : status === 'DISCHARGING'
      ? '#0284c7'
      : normalizedSoc < 20
      ? '#e11d48'
      : '#0d9488';

  return (
    <group position={[0, 0, 0]}>
      {/* Base Plinth / Ground Aura */}
      <mesh ref={auraRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.85, 32]} />
        <meshBasicMaterial color={statusColor} opacity={0.6} transparent />
      </mesh>

      {/* Heavy Steel Base Platform */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[1.65, 1.75, 0.16, 32]} />
        <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Main Structural Enclosure (Transparent Glass + Steel Frame) */}
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.2, 2.2, 32]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.1}
          metalness={0.2}
          opacity={0.22}
          transparent
        />
      </mesh>

      {/* Internal Metallic Core Pillar */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 2.1, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Dynamic Vertical Energy Fluid Level */}
      <mesh
        ref={liquidRef}
        position={[0, 0.15 + fillHeight / 2, 0]}
      >
        <cylinderGeometry args={[1.12, 1.12, fillHeight, 32]} />
        <meshStandardMaterial
          color={normalizedSoc < 20 ? '#f43f5e' : normalizedSoc < 60 ? '#0d9488' : '#059669'}
          roughness={0.2}
          metalness={0.3}
          opacity={0.8}
          transparent
        />
      </mesh>

      {/* 4 Interactive Modular Battery Racks */}
      {modules.map((m) => {
        const isSel = selectedModule === m.id;
        const isCharged = (m.soc / 100) * 1.8 >= (m.y - 0.2);

        return (
          <group
            key={m.id}
            position={[0, m.y, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectModule(m);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'default';
            }}
          >
            {/* Horizontal Module Ring Casing */}
            <mesh>
              <cylinderGeometry args={[1.24, 1.24, 0.18, 32]} />
              <meshStandardMaterial
                color={isSel ? '#3b82f6' : '#1e293b'}
                metalness={0.7}
                roughness={0.3}
                wireframe={false}
              />
            </mesh>

            {/* LED Status Dots on Module Exterior */}
            <mesh position={[1.18, 0, 0]}>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshBasicMaterial color={isCharged ? '#10b981' : '#f59e0b'} />
            </mesh>
            <mesh position={[-1.18, 0, 0]}>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshBasicMaterial color={isCharged ? '#10b981' : '#f59e0b'} />
            </mesh>
          </group>
        );
      })}

      {/* Heavy Industrial Cap & BMS Unit */}
      <mesh position={[0, 2.42, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.16, 32]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* HV Terminals */}
      <mesh position={[-0.45, 2.56, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.16, 16]} />
        <meshStandardMaterial color="#ef4444" metalness={0.9} />
      </mesh>
      <mesh position={[0.45, 2.56, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.16, 16]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.9} />
      </mesh>

      {/* Floating 3D Battery Node Information Card (UNTOUCHED WHITE CARD) */}
      <Html
        position={[0, 2.95, 0]}
        center
        distanceFactor={13}
        zIndexRange={[10, 0]}
        className="pointer-events-none select-none"
      >
        <div className="flex flex-col items-center rounded-lg border border-teal-200 bg-white/95 px-3 py-1.5 shadow-card backdrop-blur-md min-w-[140px]">
          <div className="flex items-center space-x-1.5">
            <span className={`h-2 w-2 rounded-full ${status === 'CHARGING' || status === 'DISCHARGING' ? 'bg-teal-500 animate-pulse' : 'bg-teal-600'}`} />
            <span className="font-extrabold text-[11px] text-slate-900 tracking-tight">
              Community ESS
            </span>
          </div>

          <div className="flex items-center space-x-1.5 mt-1 font-mono text-[10px]">
            <span className="rounded bg-teal-50 border border-teal-200 px-1.5 py-0.2 font-bold text-teal-900">
              {normalizedSoc.toFixed(0)}% SOC
            </span>
            <span className="font-bold text-slate-700">
              {storedEnergy.toFixed(1)} / {capacity} kWh
            </span>
          </div>

          <div className="mt-1 text-[8.5px] font-bold text-slate-500 uppercase tracking-wide">
            STATUS: <strong className={status === 'CHARGING' ? 'text-emerald-700' : status === 'DISCHARGING' ? 'text-blue-700' : 'text-slate-700'}>{status}</strong>
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Animated Traveling Energy Flow Spline (House -> Battery or Battery -> House)
 */
function BatteryFlowConduit3D({ flow }) {
  const { start, end, kw = 1.5, type = 'CHARGE', color = '#059669' } = flow;
  const pointsRef = useRef();

  const { curve, lineGeometry, midPoint } = useMemo(() => {
    const p0 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    p0.y += 0.5;
    p2.y += 0.5;
    const mid = new THREE.Vector3(
      (p0.x + p2.x) / 2,
      Math.max(p0.y, p2.y) + 1.2,
      (p0.z + p2.z) / 2
    );
    const c = new THREE.QuadraticBezierCurve3(p0, mid, p2);
    const points = c.getPoints(32);
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return { curve: c, lineGeometry: geom, midPoint: mid };
  }, [start, end]);

  const particleCount = 8;
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      offset: i / particleCount,
    }));
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position.array;
    const speed = 0.55;

    particles.forEach((p, idx) => {
      p.offset = (p.offset + delta * speed) % 1.0;
      const point = curve.getPoint(p.offset);
      positions[idx * 3] = point.x;
      positions[idx * 3 + 1] = point.y;
      positions[idx * 3 + 2] = point.z;
    });

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [particleCount]);

  return (
    <group>
      <line geometry={lineGeometry}>
        <lineBasicMaterial color={color} linewidth={2} opacity={0.8} transparent />
      </line>

      <points ref={pointsRef} geometry={particleGeometry}>
        <pointsMaterial color={color} size={0.24} transparent opacity={0.95} sizeAttenuation />
      </points>

      {/* Transparent Glass Flow Value Pill */}
      <Html
        position={[midPoint.x, midPoint.y + 0.25, midPoint.z]}
        center
        distanceFactor={15}
        zIndexRange={[10, 0]}
        className="pointer-events-none select-none"
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          className="flex items-center space-x-1 rounded-full border border-teal-400/35 px-2 py-0.2 shadow-none"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          <span
            style={{ textShadow: '0 1px 2px rgba(255,255,255,0.95)' }}
            className="font-mono font-black text-[10px] text-slate-900 whitespace-nowrap"
          >
            {type === 'CHARGE' ? `+${kw.toFixed(1)} kW (Charging)` : `-${kw.toFixed(1)} kW (Discharge)`}
          </span>
        </div>
      </Html>
    </group>
  );
}

/**
 * 🏠 Context Node for House A, B, C or Grid Substation
 */
function SurroundingNode3D({ position, name, subtitle, color = '#3b82f6', isSelected, onClick }) {
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.3, 0.9, 1.3]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.1, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.1, 0.5, 4]} />
        <meshStandardMaterial color={color} metalness={0.6} />
      </mesh>

      {/* Node Information Card (UNTOUCHED WHITE CARD) */}
      <Html
        position={[0, 1.75, 0]}
        center
        distanceFactor={13}
        zIndexRange={[10, 0]}
        className="pointer-events-none select-none"
      >
        <div className={`flex flex-col items-center rounded-lg border px-2 py-1 shadow-xs bg-white/95 backdrop-blur-md ${isSelected ? 'ring-1.5 ring-slate-900 border-slate-900' : 'border-slate-200'}`}>
          <span className="font-bold text-[10.5px] text-slate-900 whitespace-nowrap">{name}</span>
          {subtitle && (
            <span className="font-mono text-[9px] font-bold text-slate-500 mt-0.5">{subtitle}</span>
          )}
        </div>
      </Html>
    </group>
  );
}

const InteractiveBatteryTwin3D = forwardRef(function InteractiveBatteryTwin3D(
  {
    battery = { soc: 60, capacity: 20, storedKwh: 12 },
    status = 'IDLE',
    activeFlow = null,
    selectedSource = 'house_a',
    selectedDestination = 'house_b',
    selectedModule = null,
    onSelectModule,
    households = [],
  },
  ref
) {
  const controlsRef = useRef();

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (controlsRef.current) {
        controlsRef.current.reset();
        controlsRef.current.object.position.set(0, 6.5, 10.5);
      }
    },
    moduleCloseUp: () => {
      if (controlsRef.current) {
        controlsRef.current.object.position.set(0, 1.6, 4.2);
        controlsRef.current.target.set(0, 1.2, 0);
        controlsRef.current.update();
      }
    },
    topView: () => {
      if (controlsRef.current) {
        controlsRef.current.object.position.set(0, 13, 0.1);
        controlsRef.current.target.set(0, 0.5, 0);
        controlsRef.current.update();
      }
    },
  }));

  const houseA = households.find((h) => h.id === 'house_a') || { generation: 6.8, consumption: 2.1 };
  const houseB = households.find((h) => h.id === 'house_b') || { generation: 1.2, consumption: 4.0 };
  const houseC = households.find((h) => h.id === 'house_c') || { generation: 3.5, consumption: 2.2 };

  return (
    <div className="relative h-full w-full select-none bg-slate-50/50 rounded-2xl overflow-hidden border border-slate-200/80 shadow-card">
      <Canvas camera={{ position: [0, 6.5, 10.5], fov: 40 }} shadows className="h-full w-full">
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 16, 10]} intensity={1.2} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.4} />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={3.5}
          maxDistance={18}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0.9, 0]}
        />

        {/* Ground Plane */}
        <group position={[0, -0.01, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[9.5, 64]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} />
          </mesh>
          <gridHelper args={[18, 18, '#cbd5e1', '#f1f5f9']} position={[0, 0.002, 0]} />
        </group>

        {/* Central 3D Battery Cabinet Digital Twin */}
        <IndustrialBatteryCabinet3D
          soc={battery.soc || 60}
          capacity={battery.capacity || 20}
          storedEnergy={battery.storedKwh || 12}
          status={status}
          selectedModule={selectedModule}
          onSelectModule={onSelectModule}
        />

        {/* Context Node: House A (Solar Prosumer) */}
        <SurroundingNode3D
          position={BATTERY_VIEW_POSITIONS.house_a}
          name="House A (Solar)"
          subtitle={`+${Math.max(0, (houseA.generation - houseA.consumption)).toFixed(1)} kW Surplus`}
          color="#0f766e"
          isSelected={selectedSource === 'house_a'}
        />

        {/* Context Node: House B (EV Consumer) */}
        <SurroundingNode3D
          position={BATTERY_VIEW_POSITIONS.house_b}
          name="House B (EV Load)"
          subtitle={`-${Math.max(0, (houseB.consumption - houseB.generation)).toFixed(1)} kW Deficit`}
          color="#2563eb"
          isSelected={selectedDestination === 'house_b'}
        />

        {/* Context Node: House C (Prosumer) */}
        <SurroundingNode3D
          position={BATTERY_VIEW_POSITIONS.house_c}
          name="House C (Prosumer)"
          subtitle={`+${Math.max(0, (houseC.generation - houseC.consumption)).toFixed(1)} kW`}
          color="#0284c7"
          isSelected={selectedSource === 'house_c'}
        />

        {/* Context Node: Utility Grid Substation */}
        <SurroundingNode3D
          position={BATTERY_VIEW_POSITIONS.MAIN_UTILITY_GRID}
          name="Utility Grid"
          subtitle="Interconnect ₹6/kWh"
          color="#475569"
          isSelected={selectedSource === 'MAIN_UTILITY_GRID' || selectedDestination === 'MAIN_UTILITY_GRID'}
        />

        {/* Active Traveling Energy Flow Spline (Charge or Discharge) */}
        {activeFlow && <BatteryFlowConduit3D flow={activeFlow} />}
      </Canvas>
    </div>
  );
});

export default InteractiveBatteryTwin3D;
