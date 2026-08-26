import React, { useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import House3D from './House3D';
import Battery3D from './Battery3D';
import GridSubstation3D from './GridSubstation3D';

// Fixed spatial node coordinates for virtual microgrid
export const VIRTUAL_POSITIONS = {
  solarSun: [-4.2, 4.2, 1.2],
  houseA: [-4.2, 0, 1.2],
  houseB: [0.2, 0, 2.2],
  battery: [4.6, 0, 1.6],
  grid: [1.0, 0, -3.8],
};

/**
 * ☀️ Sun Solar Source with dynamic pulsing aura and energy ray down to House A
 */
function SolarSource3D({ position, isGenerating = true, generationKw = 6.8 }) {
  const sunRef = useRef();
  const auraRef = useRef();
  const rayRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sunRef.current) {
      sunRef.current.rotation.y = t * 0.2;
    }
    if (auraRef.current) {
      auraRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    }
    if (rayRef.current && isGenerating) {
      rayRef.current.material.opacity = 0.45 + Math.sin(t * 5) * 0.2;
    }
  });

  return (
    <group position={position}>
      {/* Central Sun Sphere */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>

      {/* Pulsing Sun Corona / Aura */}
      <mesh ref={auraRef}>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.35} />
      </mesh>

      {/* Dynamic Solar Energy Ray Beam to House A */}
      {isGenerating && (
        <mesh
          ref={rayRef}
          position={[0, -2.1, 0]}
          rotation={[0, 0, 0]}
        >
          <cylinderGeometry args={[0.08, 0.45, 3.8, 16]} />
          <meshBasicMaterial color="#fde047" transparent opacity={0.4} />
        </mesh>
      )}

      {/* Floating Solar Label */}
      <Html position={[0, 1.1, 0]} center distanceFactor={14} className="pointer-events-none select-none">
        <div className="flex items-center space-x-1 rounded-full border border-amber-300 bg-amber-50/95 px-2.5 py-0.5 shadow-sm backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          <span className="font-extrabold text-[10px] text-amber-900 uppercase tracking-wide">
            Solar Irradiance: {generationKw.toFixed(1)} kW
          </span>
        </div>
      </Html>
    </group>
  );
}

/**
 * Animated quadratic flow spline with traveling energy particles
 */
function DynamicFlowSpline({
  start,
  end,
  kw = 0,
  color = '#059669',
  label = '',
  isActive = true,
  particleSpeedMultiplier = 1.0,
}) {
  const pointsRef = useRef();

  // Create quadratic curve arched slightly upward
  const { curve, lineGeometry, midPoint } = useMemo(() => {
    const p0 = new THREE.Vector3(start[0], start[1] + 0.6, start[2]);
    const p2 = new THREE.Vector3(end[0], end[1] + 0.6, end[2]);
    const mid = new THREE.Vector3(
      (p0.x + p2.x) / 2,
      Math.max(p0.y, p2.y) + 1.1,
      (p0.z + p2.z) / 2
    );
    const c = new THREE.QuadraticBezierCurve3(p0, mid, p2);
    const points = c.getPoints(36);
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return { curve: c, lineGeometry: geom, midPoint: mid };
  }, [start, end]);

  // Number of animated particles based on power (more kW = more active flow particles)
  const particleCount = useMemo(() => {
    if (!isActive || kw <= 0.001) return 0;
    return Math.max(4, Math.min(10, Math.round(kw * 2)));
  }, [isActive, kw]);

  const particles = useMemo(() => {
    return Array.from({ length: Math.max(1, particleCount) }, (_, i) => ({
      offset: i / Math.max(1, particleCount),
    }));
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !isActive || particleCount === 0) return;
    const positions = pointsRef.current.geometry.attributes.position.array;
    const speed = (0.35 + Math.min(kw * 0.12, 0.6)) * particleSpeedMultiplier;

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
    const count = Math.max(1, particleCount);
    const pos = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [particleCount]);

  return (
    <group>
      {/* 3D Conduit Line */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          color={isActive && kw > 0.001 ? color : '#cbd5e1'}
          linewidth={isActive && kw > 0.001 ? 2.5 : 1}
          opacity={isActive && kw > 0.001 ? 0.85 : 0.25}
          transparent
        />
      </line>

      {/* Traveling Energy Particles */}
      {isActive && kw > 0.001 && (
        <points ref={pointsRef} geometry={particleGeometry}>
          <pointsMaterial
            color={color}
            size={0.22}
            transparent
            opacity={0.95}
            sizeAttenuation
          />
        </points>
      )}

      {/* Floating 3D Flow Label on Conduit Midpoint */}
      {isActive && kw > 0.001 && (
        <Html
          position={[midPoint.x, midPoint.y + 0.3, midPoint.z]}
          center
          distanceFactor={15}
          className="pointer-events-none select-none transition-all duration-200"
        >
          <div className="flex items-center space-x-1.5 rounded-full border border-slate-200 bg-white/95 px-2.5 py-0.8 shadow-sm backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono font-extrabold text-[10px] text-slate-900">
              {kw.toFixed(1)} kW
            </span>
            {label && (
              <span className="text-[8.5px] font-semibold text-slate-500">
                • {label}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Neighborhood Ground Platform
 */
function DigitalTwinGround() {
  return (
    <group position={[0, -0.01, 0]}>
      {/* Soft Ground Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[9.5, 64]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>

      {/* Accent Conduit Rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[9.3, 9.45, 64]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[6.0, 6.05, 64]} />
        <meshBasicMaterial color="#e2e8f0" opacity={0.6} transparent />
      </mesh>

      {/* Subtle Coordinate Grid Helper */}
      <gridHelper args={[18, 18, '#cbd5e1', '#f1f5f9']} position={[0, 0.002, 0]} />
    </group>
  );
}

const InteractiveMicrogridCanvas3D = forwardRef(function InteractiveMicrogridCanvas3D(
  {
    houses = [],
    metrics = {},
    isSimulating = false,
    selectedNode = 'house_a',
    onSelectNode,
  },
  ref
) {
  const controlsRef = useRef();

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (controlsRef.current) {
        controlsRef.current.reset();
      }
    },
  }));

  const houseA = houses[0] || {
    id: 'house_a',
    name: 'House A (Solar)',
    generation: 6.8,
    consumption: 2.1,
    netEnergy: 4.7,
    status: 'SURPLUS',
    hasSolar: true,
  };

  const houseB = houses[1] || {
    id: 'house_b',
    name: 'House B (EV Load)',
    generation: 1.2,
    consumption: 4.0,
    netEnergy: -2.8,
    status: 'DEFICIT',
    hasSolar: false,
  };

  const localTradeKw = metrics.localTradeKw || 0;
  const batteryAllocationKw = metrics.batteryAllocationKw || 0;
  const gridExportKw = metrics.gridExportKw || 0;
  const currentSoc = isSimulating
    ? (metrics.finalBatterySoc || metrics.initialSoc || 40)
    : (metrics.initialSoc || 40);
  const batteryCap = metrics.batteryCapacity || 20;
  const gridPrice = metrics.gridPrice || 6.0;

  return (
    <div className="relative h-full w-full select-none bg-slate-50/50 rounded-2xl overflow-hidden border border-slate-200/80 shadow-card">
      <Canvas
        camera={{ position: [0, 8.5, 12], fov: 42 }}
        shadows
        className="h-full w-full"
      >
        {/* Natural Studio Lighting */}
        <ambientLight intensity={0.85} />
        <directionalLight
          position={[10, 16, 8]}
          intensity={1.15}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-8, 10, -8]} intensity={0.4} />

        {/* Orbit Camera Controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={4}
          maxDistance={22}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={0.1}
          target={[0, 0.4, 0]}
        />

        {/* Digital Twin Ground Neighborhood */}
        <DigitalTwinGround />

        {/* 1. ☀️ Solar Source & Irradiance Stream */}
        <SolarSource3D
          position={VIRTUAL_POSITIONS.solarSun}
          isGenerating={houseA.generation > 0}
          generationKw={houseA.generation}
        />

        {/* 2. 🏠 House A (Prosumer Node) */}
        <House3D
          id={houseA.id}
          name={houseA.name}
          position={VIRTUAL_POSITIONS.houseA}
          status={houseA.status}
          generationKw={houseA.generation}
          consumptionKw={houseA.consumption}
          netKw={houseA.netEnergy}
          isSelected={selectedNode === houseA.id}
          hasSolar={houseA.hasSolar}
          onClick={onSelectNode}
        />

        {/* 3. 🏠 House B (Consumer Node) */}
        <House3D
          id={houseB.id}
          name={houseB.name}
          position={VIRTUAL_POSITIONS.houseB}
          status={houseB.status}
          generationKw={houseB.generation}
          consumptionKw={houseB.consumption}
          netKw={houseB.netEnergy}
          isSelected={selectedNode === houseB.id}
          hasSolar={houseB.hasSolar}
          onClick={onSelectNode}
        />

        {/* 4. 🔋 Community Central Battery ESS */}
        <Battery3D
          position={VIRTUAL_POSITIONS.battery}
          soc={currentSoc}
          capacityKwh={batteryCap}
          isSelected={selectedNode === 'COMMUNITY_BATTERY'}
          onClick={onSelectNode}
        />

        {/* 5. ⚡ Utility Grid Substation */}
        <GridSubstation3D
          position={VIRTUAL_POSITIONS.grid}
          gridPrice={gridPrice}
          isSelected={selectedNode === 'MAIN_UTILITY_GRID'}
          onClick={onSelectNode}
        />

        {/* 6. Dynamic Calculated 3D Energy Flow Streams */}
        {/* Flow 1: House A -> House B (Local P2P Trade) */}
        <DynamicFlowSpline
          start={VIRTUAL_POSITIONS.houseA}
          end={VIRTUAL_POSITIONS.houseB}
          kw={localTradeKw}
          color="#059669"
          label="Local Trade"
          isActive={isSimulating && localTradeKw > 0.001}
          particleSpeedMultiplier={1.1}
        />

        {/* Flow 2: House A -> Community Battery (Storage Buffer) */}
        <DynamicFlowSpline
          start={VIRTUAL_POSITIONS.houseA}
          end={VIRTUAL_POSITIONS.battery}
          kw={batteryAllocationKw}
          color="#0d9488"
          label="Storage Buffer"
          isActive={isSimulating && batteryAllocationKw > 0.001}
          particleSpeedMultiplier={0.9}
        />

        {/* Flow 3: House A -> Utility Grid (Feed-in Export) */}
        <DynamicFlowSpline
          start={VIRTUAL_POSITIONS.houseA}
          end={VIRTUAL_POSITIONS.grid}
          kw={gridExportKw}
          color="#2563eb"
          label="Grid Export"
          isActive={isSimulating && gridExportKw > 0.001}
          particleSpeedMultiplier={0.8}
        />
      </Canvas>
    </div>
  );
});

export default InteractiveMicrogridCanvas3D;
