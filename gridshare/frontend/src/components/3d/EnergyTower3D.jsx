import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import CameraControls from './CameraControls';
import Readable3DLabel from './Readable3DLabel';

function TowerColumn({ position, height, targetHeight, color, label, value, unit, badgeType, icon }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      // Smooth height interpolation
      const currentScaleY = meshRef.current.scale.y;
      meshRef.current.scale.y += (targetHeight - currentScaleY) * 0.1;
      meshRef.current.position.y = (meshRef.current.scale.y * 1.5) / 2;
    }
  });

  return (
    <group position={position}>
      {/* Plinth Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.9, 1.0, 0.1, 24]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
      </mesh>

      {/* Main 3D Energy Tower Column */}
      <mesh ref={meshRef} position={[0, (height * 1.5) / 2, 0]} scale={[1, height, 1]} castShadow receiveShadow>
        <cylinderGeometry args={[0.65, 0.65, 1.5, 24]} />
        <meshStandardMaterial
          color={color}
          roughness={0.25}
          metalness={0.15}
          opacity={0.9}
          transparent
        />
      </mesh>

      {/* Top Cap */}
      <mesh position={[0, height * 1.5 + 0.05, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.08, 24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      {/* Floating 3D Metric Overlay Label */}
      <Readable3DLabel
        position={[0, Math.max(1.8, height * 1.5 + 0.8), 0]}
        title={label}
        value={value}
        unit={unit}
        badge={icon}
        badgeType={badgeType}
        distanceFactor={15}
      />
    </group>
  );
}

export default function EnergyTower3D({
  totalGen = 6.8,
  totalCon = 4.0,
  batterySoc = 40,
  gridPrice = 6.10,
}) {
  // Normalize heights between 0.5 and 2.5
  const genHeight = Math.max(0.4, Math.min(2.5, (totalGen / 15) * 2.2));
  const conHeight = Math.max(0.4, Math.min(2.5, (totalCon / 15) * 2.2));
  const batHeight = Math.max(0.4, Math.min(2.5, (batterySoc / 100) * 2.0));
  const priceHeight = Math.max(0.4, Math.min(2.5, (gridPrice / 10) * 1.8));

  return (
    <div className="relative h-64 w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 p-2 shadow-xs overflow-hidden select-none">
      <Canvas camera={{ position: [0, 4, 7.5], fov: 38 }} shadows>
        <ambientLight intensity={0.8} />
        <directionalLight position={[6, 10, 6]} intensity={1.1} castShadow />
        <directionalLight position={[-6, 6, -4]} intensity={0.4} />

        <CameraControls preset="chart" enableZoom={false} />

        <group position={[0, -0.8, 0]}>
          <TowerColumn
            position={[-3.2, 0, 0]}
            height={genHeight}
            targetHeight={genHeight}
            color="#d97706"
            label="Total Generation"
            value={totalGen.toFixed(1)}
            unit="kW"
            badgeType="warning"
            icon="☀️ Solar PV"
          />

          <TowerColumn
            position={[-1.1, 0, 0]}
            height={conHeight}
            targetHeight={conHeight}
            color="#2563eb"
            label="Total Demand"
            value={totalCon.toFixed(1)}
            unit="kW"
            badgeType="info"
            icon="⚡ Load"
          />

          <TowerColumn
            position={[1.1, 0, 0]}
            height={batHeight}
            targetHeight={batHeight}
            color="#0d9488"
            label="Battery Storage"
            value={`${batterySoc.toFixed(0)}%`}
            unit=""
            badgeType="positive"
            icon="🔋 ESS"
          />

          <TowerColumn
            position={[3.2, 0, 0]}
            height={priceHeight}
            targetHeight={priceHeight}
            color="#64748b"
            label="Utility Tariff"
            value={`₹${gridPrice.toFixed(2)}`}
            unit="/kWh"
            badgeType="neutral"
            icon="🌐 Grid"
          />
        </group>
      </Canvas>
    </div>
  );
}
