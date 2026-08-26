import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import CameraControls from './CameraControls';

function AnimatedSpline({ start, end, color = '#059669', particleCount = 6, speed = 1.0 }) {
  const pointsRef = useRef();

  const curve = useMemo(() => {
    const p0 = new THREE.Vector3(...start);
    const p3 = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(p0, p3).multiplyScalar(0.5);
    mid.y += 0.8;
    return new THREE.QuadraticBezierCurve3(p0, mid, p3);
  }, [start, end]);

  const curvePoints = useMemo(() => curve.getPoints(25), [curve]);
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
      p.offset = (p.offset + delta * 0.45 * speed) % 1.0;
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
        <pointsMaterial color={color} size={0.16} transparent opacity={0.9} sizeAttenuation />
      </points>
    </group>
  );
}

function DispatchNode({ position, title, subtitle, value, unit, color, icon }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <Html position={[0, 1.4, 0]} center distanceFactor={12} className="pointer-events-none select-none">
        <div className="flex flex-col items-center rounded-lg border border-slate-200/90 bg-white/95 px-2 py-0.8 shadow-xs backdrop-blur-md min-w-[95px] text-center">
          <span className="font-bold text-[10px] text-slate-900 leading-tight">{title}</span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className="rounded bg-slate-100 px-1 py-0.2 text-[8px] font-bold font-mono text-slate-700">
              {subtitle}
            </span>
            <span className="font-mono font-bold text-[9.5px] text-slate-900">
              {value} {unit}
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

export default function OptimizationFlow3D({
  surplusKw = 4.70,
  tradeKw = 2.80,
  storeKw = 1.20,
  exportKw = 0.70,
}) {
  const rootPos = [-3.8, 0, 0];
  const tradePos = [3.2, 0, -1.8];
  const storePos = [3.2, 0, 0];
  const exportPos = [3.2, 0, 1.8];

  return (
    <div className="relative h-60 w-full rounded-xl border border-slate-200/90 bg-slate-50/40 p-2 shadow-xs overflow-hidden select-none">
      <Canvas camera={{ position: [0, 5, 7.5], fov: 36 }} shadows>
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 10, 6]} intensity={1.1} castShadow />
        <directionalLight position={[-6, 6, -4]} intensity={0.4} />

        <CameraControls preset="flow" enableZoom={false} />

        {/* Source Prosumer Node */}
        <DispatchNode
          position={rootPos}
          title="House A Solar"
          subtitle="Surplus"
          value={surplusKw.toFixed(2)}
          unit="kW"
          color="#d97706"
          icon="☀️"
        />

        {/* Priority 1: P2P Local Trade */}
        <DispatchNode
          position={tradePos}
          title="1. Local Trade"
          subtitle="P2P House B"
          value={tradeKw.toFixed(2)}
          unit="kW"
          color="#059669"
          icon="🤝"
        />

        {/* Priority 2: Battery ESS */}
        <DispatchNode
          position={storePos}
          title="2. Community Battery"
          subtitle="Storage Buffer"
          value={storeKw.toFixed(2)}
          unit="kW"
          color="#0d9488"
          icon="🔋"
        />

        {/* Priority 3: Utility Grid Sync */}
        <DispatchNode
          position={exportPos}
          title="3. Utility Grid"
          subtitle="Feed-in Export"
          value={exportKw.toFixed(2)}
          unit="kW"
          color="#2563eb"
          icon="🌐"
        />

        {/* Connecting 3D Conduits */}
        <AnimatedSpline start={rootPos} end={tradePos} color="#059669" particleCount={6} speed={1.2} />
        <AnimatedSpline start={rootPos} end={storePos} color="#0d9488" particleCount={4} speed={0.9} />
        <AnimatedSpline start={rootPos} end={exportPos} color="#2563eb" particleCount={3} speed={0.7} />
      </Canvas>
    </div>
  );
}
