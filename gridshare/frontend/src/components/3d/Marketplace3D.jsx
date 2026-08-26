import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import CameraControls from './CameraControls';

function MarketFlowLine({ start, end, color = '#059669', count = 8 }) {
  const pointsRef = useRef();

  const curve = useMemo(() => {
    const p0 = new THREE.Vector3(...start);
    const p3 = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(p0, p3).multiplyScalar(0.5);
    mid.y += 0.9;
    return new THREE.QuadraticBezierCurve3(p0, mid, p3);
  }, [start, end]);

  const curvePoints = useMemo(() => curve.getPoints(25), [curve]);
  const lineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(curvePoints), [curvePoints]);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      offset: i / count,
    }));
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position.array;

    particles.forEach((p, idx) => {
      p.offset = (p.offset + delta * 0.4) % 1.0;
      const point = curve.getPoint(p.offset);
      positions[idx * 3] = point.x;
      positions[idx * 3 + 1] = point.y;
      positions[idx * 3 + 2] = point.z;
    });

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [count]);

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

function MarketNode({ position, title, subtitle, value, badgeColor, isSeller = false }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.8, 1.0]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      <mesh position={[0, 0.85, 0]}>
        <coneGeometry args={[0.7, 0.35, 4]} />
        <meshStandardMaterial color={isSeller ? '#d97706' : '#2563eb'} metalness={0.5} />
      </mesh>

      <Html position={[0, 1.45, 0]} center distanceFactor={12} className="pointer-events-none select-none">
        <div className="flex flex-col items-center rounded-lg border border-slate-200/90 bg-white/95 px-2 py-0.8 shadow-xs backdrop-blur-md min-w-[90px] text-center">
          <span className="font-bold text-[10px] text-slate-900 leading-tight">{title}</span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className={`rounded px-1 py-0.2 text-[8px] font-bold font-mono ${badgeColor}`}>
              {subtitle}
            </span>
            <span className="font-mono font-bold text-[9.5px] text-slate-900">
              {value}
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

export default function Marketplace3D({
  sellerId = "House A",
  sellerSurplus = 4.70,
  buyerId = "House B",
  buyerDeficit = 2.80,
  clearedKw = 2.80,
  tariff = "₹4.50/kWh",
}) {
  const sellerPos = [-3.2, 0, 0];
  const buyerPos = [3.2, 0, 0];
  const midpointPos = [0, 1.0, 0];

  return (
    <div className="relative h-60 w-full rounded-xl border border-slate-200/90 bg-slate-50/40 p-2 shadow-xs overflow-hidden select-none">
      <Canvas camera={{ position: [0, 4.5, 7], fov: 36 }} shadows>
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 10, 6]} intensity={1.1} castShadow />
        <directionalLight position={[-6, 6, -4]} intensity={0.4} />

        <CameraControls preset="flow" enableZoom={false} />

        <MarketNode
          position={sellerPos}
          title={sellerId}
          subtitle="SELL OFFER"
          value={`${sellerSurplus.toFixed(2)} kWh`}
          badgeColor="bg-amber-50 text-amber-800 border border-amber-200"
          isSeller={true}
        />

        {/* Central Clearing Hub */}
        <group position={midpointPos}>
          <mesh>
            <octahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial color="#059669" emissive="#059669" emissiveIntensity={0.4} roughness={0.2} />
          </mesh>

          <Html position={[0, 0.7, 0]} center distanceFactor={12} className="pointer-events-none select-none">
            <div className="rounded-lg border border-emerald-300 bg-emerald-50/95 px-2 py-0.8 shadow-xs backdrop-blur-md text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-900 block">P2P Cleared</span>
              <span className="font-mono text-[10px] font-bold text-emerald-800">{clearedKw.toFixed(2)} kW @ {tariff}</span>
            </div>
          </Html>
        </group>

        <MarketNode
          position={buyerPos}
          title={buyerId}
          subtitle="BUY REQUEST"
          value={`${buyerDeficit.toFixed(2)} kWh`}
          badgeColor="bg-blue-50 text-blue-800 border border-blue-200"
          isSeller={false}
        />

        <MarketFlowLine start={sellerPos} end={midpointPos} color="#d97706" count={6} />
        <MarketFlowLine start={midpointPos} end={buyerPos} color="#059669" count={6} />
      </Canvas>
    </div>
  );
}
