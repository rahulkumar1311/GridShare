import React, { useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import House3D from './House3D';
import Battery3D from './Battery3D';
import GridSubstation3D from './GridSubstation3D';

export const MARKET_3D_POSITIONS = {
  solarSun: [-4.2, 4.2, 1.2],
  house_a: [-4.2, 0, 1.2],
  house_b: [0.2, 0, 2.2],
  house_c: [-2.2, 0, -2.0],
  market_hub: [-1.2, 0, 0.4],
  COMMUNITY_BATTERY: [4.6, 0, 1.6],
  MAIN_UTILITY_GRID: [1.2, 0, -3.8],
};

/**
 * ☀️ Sun Solar Source with subtle glass status label
 */
function SolarSun3D({ position, generationKw = 6.8, hideHtml = false }) {
  const sunRef = useRef();
  const auraRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sunRef.current) sunRef.current.rotation.y = t * 0.2;
    if (auraRef.current) auraRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
  });

  return (
    <group position={position}>
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <mesh ref={auraRef}>
        <sphereGeometry args={[0.92, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.35} />
      </mesh>
      {!hideHtml && (
        <Html position={[0, 1.0, 0]} center distanceFactor={14} zIndexRange={[10, 0]} className="pointer-events-none select-none">
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            className="flex items-center space-x-1 rounded-full border border-amber-400/30 px-1.5 py-0.2 shadow-none"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0 animate-ping" />
            <span
              style={{ textShadow: '0 1px 2px rgba(255,255,255,0.95)' }}
              className="font-extrabold text-[9px] text-amber-950 font-mono whitespace-nowrap"
            >
              ☀ Solar • {generationKw.toFixed(1)} kW
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * 🏛️ Decentralized Market Hub Node (Clean geometric marker with zero center overlay clutter)
 */
function MarketHub3D({ position, isMatching = false }) {
  const hubRef = useRef();

  useFrame(({ clock }) => {
    if (hubRef.current) {
      hubRef.current.rotation.y = clock.getElapsedTime() * (isMatching ? 1.5 : 0.4);
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.7, 0.8, 0.08, 24]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} opacity={0.6} transparent />
      </mesh>
      <mesh ref={hubRef} position={[0, 0.35, 0]}>
        <octahedronGeometry args={[0.35]} />
        <meshStandardMaterial
          color={isMatching ? '#8b5cf6' : '#64748b'}
          roughness={0.2}
          metalness={0.8}
          wireframe={!isMatching}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  );
}

/**
 * Animated Traveling Energy or Money Flow Spline with transparent glass value label
 */
function FlowConduit3D({ flow, hideHtml = false }) {
  const {
    id,
    start,
    end,
    kw = 0,
    amountInr = 0,
    type = 'ENERGY', // ENERGY, MONEY, MATCHING
    color = '#059669',
    isActive = true,
  } = flow;

  const pointsRef = useRef();

  const { curve, lineGeometry, midPoint } = useMemo(() => {
    const p0 = new THREE.Vector3(start[0], start[1] + 0.6, start[2]);
    const p2 = new THREE.Vector3(end[0], end[1] + 0.6, end[2]);
    const mid = new THREE.Vector3(
      (p0.x + p2.x) / 2,
      Math.max(p0.y, p2.y) + (type === 'MONEY' ? 1.4 : 1.0),
      (p0.z + p2.z) / 2
    );
    const c = new THREE.QuadraticBezierCurve3(p0, mid, p2);
    const points = c.getPoints(32);
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return { curve: c, lineGeometry: geom, midPoint: mid };
  }, [start, end, type]);

  const particleCount = useMemo(() => {
    if (!isActive) return 0;
    if (type === 'MONEY') return 3;
    if (type === 'MATCHING') return 4;
    return Math.max(4, Math.min(12, Math.round(kw * 2.5)));
  }, [isActive, kw, type]);

  const particles = useMemo(() => {
    return Array.from({ length: Math.max(1, particleCount) }, (_, i) => ({
      offset: i / Math.max(1, particleCount),
    }));
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !isActive || particleCount === 0) return;
    const positions = pointsRef.current.geometry.attributes.position.array;
    const speed = type === 'MONEY' ? 0.6 : (0.4 + Math.min(kw * 0.15, 0.7));

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

  const isMoney = type === 'MONEY';

  return (
    <group>
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          color={isActive ? color : '#cbd5e1'}
          linewidth={isActive ? 2 : 1}
          opacity={isActive ? 0.85 : 0.25}
          transparent
        />
      </line>

      {isActive && particleCount > 0 && (
        <points ref={pointsRef} geometry={particleGeometry}>
          <pointsMaterial
            color={color}
            size={isMoney ? 0.28 : 0.22}
            transparent
            opacity={0.95}
            sizeAttenuation
          />
        </points>
      )}

      {isActive && !hideHtml && (
        <Html
          position={[midPoint.x, midPoint.y + 0.25, midPoint.z]}
          center
          distanceFactor={15}
          zIndexRange={[10, 0]}
          className="pointer-events-none select-none"
        >
          <div
            style={{
              background: isMoney ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            className={`flex items-center space-x-1 rounded-full border px-1.5 py-0.2 shadow-none ${
              isMoney ? 'border-amber-400/35' : 'border-emerald-400/30'
            }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span
              style={{
                textShadow: '0 1px 2px rgba(255,255,255,0.95), 0 0 3px rgba(255,255,255,0.9)',
              }}
              className={`font-mono font-black text-[9.5px] whitespace-nowrap ${
                isMoney ? 'text-amber-950' : 'text-slate-900'
              }`}
            >
              {isMoney ? `₹${amountInr.toFixed(2)}` : `${kw.toFixed(1)} kWh`}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * 3D Compact Transparent Order Badges Floating over Houses (Never blocking house nodes)
 */
function HouseOrderBadge({ position, sellOrders = [], buyOrders = [], hideHtml = false }) {
  const openSell = sellOrders.find((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED' || o.status === 'AVAILABLE');
  const openBuy = buyOrders.find((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED' || o.status === 'AVAILABLE');

  if (!openSell && !openBuy) return null;
  if (hideHtml) return null;

  return (
    <Html position={[position[0], position[1] + 2.7, position[2]]} center distanceFactor={14} zIndexRange={[10, 0]} className="pointer-events-none select-none">
      <div className="flex flex-col items-center space-y-1">
        {openSell && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            className="flex items-center space-x-1 rounded-full border border-emerald-400/35 px-1.5 py-0.2 shadow-none"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
            <span
              style={{ textShadow: '0 1px 2px rgba(255,255,255,0.95)' }}
              className="text-[8.5px] font-black text-emerald-950 font-mono whitespace-nowrap"
            >
              SELL • {openSell.remaining_kwh.toFixed(1)} kWh • ₹{openSell.min_price_per_kwh.toFixed(2)}
            </span>
          </div>
        )}
        {openBuy && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            className="flex items-center space-x-1 rounded-full border border-blue-400/35 px-1.5 py-0.2 shadow-none"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0" />
            <span
              style={{ textShadow: '0 1px 2px rgba(255,255,255,0.95)' }}
              className="text-[8.5px] font-black text-blue-950 font-mono whitespace-nowrap"
            >
              BUY • {openBuy.remaining_kwh.toFixed(1)} kWh • ₹{openBuy.max_price_per_kwh.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </Html>
  );
}

const MarketplaceScene3D = forwardRef(function MarketplaceScene3D(
  {
    households = [],
    battery = {},
    grid = {},
    orders = { sellOrders: [], buyOrders: [] },
    activeFlows = [],
    isMatching = false,
    selectedNode = 'house_a',
    onSelectNode,
    isModalOpen = false,
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
    marketView: () => {
      if (controlsRef.current) {
        controlsRef.current.object.position.set(-2.0, 7.5, 11.5);
        controlsRef.current.target.set(0, 0.4, 0);
        controlsRef.current.update();
      }
    },
  }));

  const housesList = [
    { id: 'house_a', name: 'House A (Solar)', hasSolar: true },
    { id: 'house_b', name: 'House B (EV Load)', hasSolar: false },
    { id: 'house_c', name: 'House C (Prosumer)', hasSolar: true },
  ];

  const nodeMap = {};
  households.forEach((h) => {
    nodeMap[h.id] = h;
  });

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
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
            <ringGeometry args={[9.3, 9.45, 64]} />
            <meshBasicMaterial color="#e2e8f0" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
            <ringGeometry args={[6.0, 6.05, 64]} />
            <meshBasicMaterial color="#e2e8f0" opacity={0.6} transparent />
          </mesh>
          <gridHelper args={[18, 18, '#cbd5e1', '#f1f5f9']} position={[0, 0.002, 0]} />
        </group>

        {/* ☀️ Solar Irradiance Sun */}
        <SolarSun3D
          position={MARKET_3D_POSITIONS.solarSun}
          generationKw={nodeMap['house_a']?.generation || 6.8}
          hideHtml={isModalOpen}
        />

        {/* 🏛️ Central Decentralized Market Hub Geometric Node (Zero center text clutter) */}
        <MarketHub3D
          position={MARKET_3D_POSITIONS.market_hub}
          isMatching={isMatching}
        />

        {/* 🏠 3D Households with unchanged Primary Node Cards */}
        {housesList.map((h) => {
          const stats = nodeMap[h.id] || {
            generation: 0,
            consumption: 0,
            netEnergy: 0,
            status: 'BALANCED',
          };
          const pos = MARKET_3D_POSITIONS[h.id] || [0, 0, 0];

          const sellsForHouse = (orders.sellOrders || []).filter((o) => o.household_id === h.id);
          const buysForHouse = (orders.buyOrders || []).filter((o) => o.household_id === h.id);

          return (
            <group key={h.id}>
              <House3D
                id={h.id}
                name={h.name}
                position={pos}
                status={stats.status || 'BALANCED'}
                generationKw={stats.generation || 0}
                consumptionKw={stats.consumption || 0}
                netKw={stats.netEnergy || 0}
                isSelected={selectedNode === h.id}
                hasSolar={h.hasSolar}
                onClick={onSelectNode}
              />

              {/* Compact Transparent Floating Order Badges */}
              <HouseOrderBadge
                position={pos}
                sellOrders={sellsForHouse}
                buyOrders={buysForHouse}
                hideHtml={isModalOpen}
              />
            </group>
          );
        })}

        {/* 🔋 Community Battery ESS with unchanged Primary Node Card */}
        <Battery3D
          position={MARKET_3D_POSITIONS['COMMUNITY_BATTERY']}
          soc={battery.soc || 40}
          capacityKwh={battery.capacity || 20}
          isSelected={selectedNode === 'COMMUNITY_BATTERY'}
          onClick={onSelectNode}
        />

        {/* ⚡ Utility Grid Substation with unchanged Primary Node Card */}
        <GridSubstation3D
          position={MARKET_3D_POSITIONS['MAIN_UTILITY_GRID']}
          gridPrice={grid.exportPrice || 6.0}
          isSelected={selectedNode === 'MAIN_UTILITY_GRID'}
          onClick={onSelectNode}
        />

        {/* Dynamic Traveling Flow Splines (Energy Particles & Transparent Flow Values) */}
        {activeFlows.map((flow) => (
          <FlowConduit3D key={flow.id} flow={flow} hideHtml={isModalOpen} />
        ))}
      </Canvas>
    </div>
  );
});

export default MarketplaceScene3D;
