import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import CameraControls from './CameraControls';

// Animated Flow Conduit with Particles
function OwnershipFlowLine({ start, end, color = '#059669', particleCount = 6, speed = 1.0, direction = 1 }) {
  const pointsRef = useRef();

  const curve = useMemo(() => {
    const p0 = new THREE.Vector3(...start);
    const p3 = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(p0, p3).multiplyScalar(0.5);
    mid.y += 1.0;
    return new THREE.QuadraticBezierCurve3(p0, mid, p3);
  }, [start, end]);

  const curvePoints = useMemo(() => curve.getPoints(30), [curve]);
  const lineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(curvePoints), [curvePoints]);

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      offset: i / particleCount,
    }));
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position.array;

    particles.forEach((p, idx) => {
      if (direction === 1) {
        p.offset = (p.offset + delta * 0.4 * speed) % 1.0;
      } else {
        p.offset = (p.offset - delta * 0.4 * speed + 1.0) % 1.0;
      }
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
        <lineBasicMaterial color={color} transparent opacity={0.35} linewidth={2} />
      </line>

      <points ref={pointsRef} geometry={particleGeometry}>
        <pointsMaterial color={color} size={0.18} transparent opacity={0.9} sizeAttenuation />
      </points>
    </group>
  );
}

// 3D Battery Cylinder
function CentralBattery3D({ soc = 40, capacity = 20, stored = 8, efficiency = 90 }) {
  const fillHeight = Math.max(0.2, (soc / 100) * 2.0);

  return (
    <group position={[0, 0, 0]}>
      {/* Outer Protective Glass Casing */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 2.2, 32]} />
        <meshStandardMaterial
          color="#0f172a"
          transparent
          opacity={0.12}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Inner Active Charge Cylinder */}
      <mesh position={[0, fillHeight / 2 + 0.05, 0]}>
        <cylinderGeometry args={[0.95, 0.95, fillHeight, 32]} />
        <meshStandardMaterial
          color="#0d9488"
          emissive="#0d9488"
          emissiveIntensity={0.35}
          roughness={0.3}
        />
      </mesh>

      {/* Top Cap */}
      <mesh position={[0, 2.25, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.12, 32]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>

      {/* Base Platform */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.08, 32]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Battery Label Overlay */}
      <Html position={[0, 2.6, 0]} center distanceFactor={13} className="pointer-events-none select-none">
        <div className="rounded-lg border border-teal-200 bg-white/95 px-2.5 py-1 shadow-xs backdrop-blur-md text-center">
          <div className="flex items-center justify-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span className="font-mono text-[10.5px] font-bold text-slate-900">COMMUNITY ESS ({soc.toFixed(0)}% SOC)</span>
          </div>
          <div className="text-[9.5px] font-mono text-slate-600 mt-0.5">
            <span className="font-bold text-teal-700">{stored.toFixed(1)} kWh</span> / {capacity} kWh | {efficiency}% η
          </div>
        </div>
      </Html>
    </group>
  );
}

// 3D Contributor House Node
function ContributorNode3D({ position, householdId, name, contributionKwh, usableCreditKwh, sharePct, color = '#059669' }) {
  return (
    <group position={position}>
      {/* Small Building Mesh */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.1, 0.8, 1.1]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>

      {/* Solar Roof Pitch */}
      <mesh position={[0, 0.95, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.9, 0.45, 4]} />
        <meshStandardMaterial color="#0284c7" metalness={0.6} />
      </mesh>

      {/* Ground Base */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.04, 16]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      {/* Floating Compact Info Overlay */}
      <Html position={[0, 1.5, 0]} center distanceFactor={12} className="pointer-events-none select-none">
        <div className="rounded-lg border border-slate-200 bg-white/95 px-2 py-1 shadow-xs backdrop-blur-md min-w-[110px] text-center">
          <span className="font-bold text-slate-900 text-[10px] block">{name}</span>
          <div className="text-[9px] font-mono text-slate-600 mt-0.5">
            Contrib: <span className="font-bold text-slate-900">{contributionKwh.toFixed(1)} kWh</span>
          </div>
          <div className="text-[9px] font-mono text-emerald-700 font-bold">
            Usable: {usableCreditKwh.toFixed(2)} kWh ({sharePct.toFixed(1)}%)
          </div>
        </div>
      </Html>
    </group>
  );
}

export default function BatteryOwnership3D({
  batterySoc = 50,
  capacity = 20,
  storedEnergy = 11,
  efficiency = 90,
  ownershipShares = [],
  mode = 'CONTRIBUTION',
}) {
  const houseCoordinates = {
    house_a: [-3.8, 0, 0.4],
    house_b: [3.8, 0, 0.4],
    house_e: [0, 0, 3.4],
  };

  const houseNames = {
    house_a: 'House A (8kW Prosumer)',
    house_b: 'House B (EV Consumer)',
    house_e: 'House E (6kW Prosumer)',
  };

  const contributors = ownershipShares.length > 0 ? ownershipShares : [
    { household_id: 'house_a', contributed_kwh: 10.0, usable_credit_kwh: 9.0, ownership_percent: 90.9 },
    { household_id: 'house_b', contributed_kwh: 1.0, usable_credit_kwh: 0.9, ownership_percent: 9.1 },
  ];

  return (
    <div className="relative h-[270px] w-full rounded-xl border border-slate-200/90 bg-white shadow-card overflow-hidden">
      <Canvas
        camera={{ position: [0, 5.5, 7.5], fov: 36 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />
        <directionalLight position={[-10, 10, -10]} intensity={0.4} />

        <CentralBattery3D
          soc={batterySoc}
          capacity={capacity}
          stored={storedEnergy}
          efficiency={efficiency}
        />

        {contributors.map((c) => {
          const pos = houseCoordinates[c.household_id] || [-3, 0, 2];
          const name = houseNames[c.household_id] || c.household_id;
          const direction = mode === 'WITHDRAWAL' ? -1 : 1;

          return (
            <group key={c.household_id}>
              <ContributorNode3D
                position={pos}
                householdId={c.household_id}
                name={name}
                contributionKwh={c.contributed_kwh || 0}
                usableCreditKwh={c.usable_credit_kwh || c.remaining_credit_kwh || 0}
                sharePct={c.ownership_percent || 0}
              />

              <OwnershipFlowLine
                start={pos}
                end={[0, 1.1, 0]}
                color={mode === 'WITHDRAWAL' ? '#0284c7' : '#059669'}
                particleCount={Math.max(3, Math.round((c.ownership_percent || 10) / 12))}
                speed={1.0}
                direction={direction}
              />
            </group>
          );
        })}

        <CameraControls autoRotate={false} maxDistance={12} minDistance={4} />
        <gridHelper args={[16, 16, '#e2e8f0', '#f1f5f9']} position={[0, -0.01, 0]} />
      </Canvas>

      <div className="absolute top-2.5 left-2.5 select-none pointer-events-none">
        <div className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white/95 px-2 py-0.8 shadow-xs backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
            3D Storage Ownership Mesh
          </span>
        </div>
      </div>
    </div>
  );
}
