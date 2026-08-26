import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import House3D from './House3D';
import Battery3D from './Battery3D';
import GridSubstation3D from './GridSubstation3D';

export const FORECAST_3D_POSITIONS = {
  solarSun: [-4.2, 4.2, 1.2],
  house_a: [-4.2, 0, 1.2],
  house_b: [0.2, 0, 2.2],
  house_c: [-2.2, 0, -2.0],
  COMMUNITY_BATTERY: [4.6, 0, 1.6],
  MAIN_UTILITY_GRID: [1.2, 0, -3.8],
};

/**
 * Animated Traveling Forecast Energy Route
 */
function ForecastSpline3D({ start, end, kw = 1.5, type = 'SOLAR', label = '', color = '#059669' }) {
  const pointsRef = useRef();

  const { curve, lineGeometry, midPoint } = useMemo(() => {
    const p0 = new THREE.Vector3(start[0], start[1] + 0.6, start[2]);
    const p2 = new THREE.Vector3(end[0], end[1] + 0.6, end[2]);
    const mid = new THREE.Vector3(
      (p0.x + p2.x) / 2,
      Math.max(p0.y, p2.y) + 1.1,
      (p0.z + p2.z) / 2
    );
    const c = new THREE.QuadraticBezierCurve3(p0, mid, p2);
    const points = c.getPoints(32);
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return { curve: c, lineGeometry: geom, midPoint: mid };
  }, [start, end]);

  const particleCount = Math.max(3, Math.min(10, Math.round(kw * 2.2)));

  const particles = useMemo(() => {
    return Array.from({ length: Math.max(1, particleCount) }, (_, i) => ({
      offset: i / Math.max(1, particleCount),
    }));
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!pointsRef.current || particleCount === 0) return;
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
    const count = Math.max(1, particleCount);
    const pos = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [particleCount]);

  return (
    <group>
      <line geometry={lineGeometry}>
        <lineBasicMaterial color={color} linewidth={2} opacity={0.8} transparent />
      </line>

      {particleCount > 0 && (
        <points ref={pointsRef} geometry={particleGeometry}>
          <pointsMaterial color={color} size={0.24} transparent opacity={0.95} sizeAttenuation />
        </points>
      )}

      <Html
        position={[midPoint.x, midPoint.y + 0.25, midPoint.z]}
        center
        distanceFactor={15}
        zIndexRange={[10, 0]}
        className="pointer-events-none select-none"
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.16)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          className="flex items-center space-x-1 rounded-full border border-white/35 px-1.5 py-0.2 shadow-none"
        >
          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span
            style={{ textShadow: '0 1px 2px rgba(255,255,255,0.95)' }}
            className="font-mono font-black text-[9.5px] text-slate-900 whitespace-nowrap"
          >
            {kw.toFixed(1)} kW • {label}
          </span>
        </div>
      </Html>
    </group>
  );
}

const AiForecastScene3D = forwardRef(function AiForecastScene3D(
  {
    currentTimeStr = '12:00',
    currentSolarKw = 6.5,
    currentLoadKw = 7.2,
    currentSoc = 60,
    activeForecastFlows = [],
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
        controlsRef.current.object.position.set(0, 8.5, 13.5);
      }
    },
    topView: () => {
      if (controlsRef.current) {
        controlsRef.current.object.position.set(0, 15, 0.1);
        controlsRef.current.target.set(0, 0.4, 0);
        controlsRef.current.update();
      }
    },
    sideView: () => {
      if (controlsRef.current) {
        controlsRef.current.object.position.set(-8.0, 7.5, 9.5);
        controlsRef.current.target.set(0, 0.4, 0);
        controlsRef.current.update();
      }
    },
  }));

  const housesList = [
    {
      id: 'house_a',
      name: 'House A (Solar)',
      hasSolar: true,
      generation: currentSolarKw,
      consumption: 2.1,
      netEnergy: currentSolarKw - 2.1,
      status: currentSolarKw > 2.1 ? 'SURPLUS' : 'DEFICIT',
    },
    {
      id: 'house_b',
      name: 'House B (EV Load)',
      hasSolar: false,
      generation: 0.0,
      consumption: Math.max(1.0, currentLoadKw - 3.0),
      netEnergy: -(Math.max(1.0, currentLoadKw - 3.0)),
      status: 'DEFICIT',
    },
    {
      id: 'house_c',
      name: 'House C (Prosumer)',
      hasSolar: true,
      generation: currentSolarKw * 0.4,
      consumption: 1.8,
      netEnergy: currentSolarKw * 0.4 - 1.8,
      status: currentSolarKw * 0.4 > 1.8 ? 'SURPLUS' : 'BALANCED',
    },
  ];

  return (
    <div className="relative h-full w-full select-none bg-slate-50/50 rounded-2xl overflow-hidden border border-slate-200/80 shadow-card">
      <Canvas camera={{ position: [0, 8.5, 13.5], fov: 40 }} shadows className="h-full w-full">
        <ambientLight intensity={0.85} />
        <directionalLight position={[10, 16, 8]} intensity={1.15} castShadow />
        <directionalLight position={[-8, 10, -8]} intensity={0.4} />

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

        {/* Soft Neighborhood Ground Disc */}
        <group position={[0, -0.01, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[9.5, 64]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} />
          </mesh>
          <gridHelper args={[18, 18, '#cbd5e1', '#f1f5f9']} position={[0, 0.002, 0]} />
        </group>

        {/* ☀️ Solar Irradiance Sun (scaled with current solar forecast) */}
        <group position={FORECAST_3D_POSITIONS.solarSun}>
          <mesh>
            <sphereGeometry args={[Math.max(0.35, Math.min(0.85, (currentSolarKw / 8) * 0.7)), 32, 32]} />
            <meshBasicMaterial color={currentSolarKw > 1.0 ? '#f59e0b' : '#64748b'} />
          </mesh>
          <Html position={[0, 1.0, 0]} center distanceFactor={14} zIndexRange={[10, 0]} className="pointer-events-none select-none">
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
              className="flex items-center space-x-1 rounded-full border border-amber-400/30 px-1.5 py-0.2 shadow-none"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${currentSolarKw > 1 ? 'bg-amber-500 animate-ping' : 'bg-slate-400'}`} />
              <span
                style={{ textShadow: '0 1px 2px rgba(255,255,255,0.95)' }}
                className="font-extrabold text-[9px] text-amber-950 font-mono whitespace-nowrap"
              >
                ☀ Forecast Solar: {currentSolarKw.toFixed(1)} kW
              </span>
            </div>
          </Html>
        </group>

        {/* 🏠 3D Households */}
        {housesList.map((h) => {
          const pos = FORECAST_3D_POSITIONS[h.id] || [0, 0, 0];

          return (
            <House3D
              key={h.id}
              id={h.id}
              name={h.name}
              position={pos}
              status={h.status}
              generationKw={h.generation}
              consumptionKw={h.consumption}
              netKw={h.netEnergy}
              isSelected={selectedNode === h.id}
              hasSolar={h.hasSolar}
              onClick={onSelectNode}
            />
          );
        })}

        {/* 🔋 Community Battery ESS (visual fill reflects forecasted SOC) */}
        <Battery3D
          position={FORECAST_3D_POSITIONS['COMMUNITY_BATTERY']}
          soc={currentSoc}
          capacityKwh={20}
          isSelected={selectedNode === 'COMMUNITY_BATTERY'}
          onClick={onSelectNode}
        />

        {/* ⚡ Utility Grid Substation */}
        <GridSubstation3D
          position={FORECAST_3D_POSITIONS['MAIN_UTILITY_GRID']}
          gridPrice={6.0}
          isSelected={selectedNode === 'MAIN_UTILITY_GRID'}
          onClick={onSelectNode}
        />

        {/* Forecast Active Particle Splines */}
        {activeForecastFlows.map((flow) => (
          <ForecastSpline3D
            key={flow.id}
            start={flow.start}
            end={flow.end}
            kw={flow.kw}
            type={flow.type}
            label={flow.label}
            color={flow.color}
          />
        ))}
      </Canvas>
    </div>
  );
});

export default AiForecastScene3D;
