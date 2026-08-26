import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Animated 3D Energy Conduit Particle Stream
 * Renders high-visibility glowing energy pulses moving dynamically along 3D curves.
 */
function EnergyFlowStream({
  start,
  end,
  color = '#10b981',
  rate = 1.0,
  active = true,
  particleCount = 9,
  curveHeight = 0.6,
  pulseSize = 0.12,
}) {
  const { points, curve } = useMemo(() => {
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mid.y += curveHeight;
    const qCurve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    return {
      points: qCurve.getPoints(36),
      curve: qCurve,
    };
  }, [start, end, curveHeight]);

  const lineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  const particlesRef = useRef([]);

  useFrame(({ clock }) => {
    if (!active) return;
    const speed = Math.max(0.6, Math.min(2.5, rate));
    const t = clock.getElapsedTime() * speed;
    particlesRef.current.forEach((mesh, idx) => {
      if (mesh) {
        const offset = (t + idx / particleCount) % 1;
        const pos = curve.getPoint(offset);
        mesh.position.copy(pos);
        // Pulse glow size
        const s = pulseSize * (1 + Math.sin(t * 6 + idx * 1.5) * 0.25);
        mesh.scale.set(s, s, s);
      }
    });
  });

  if (!active) return null;

  return (
    <group>
      {/* Base glowing pathway conduit */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.45} linewidth={2} />
      </line>

      {/* Directional moving energy pulses */}
      {Array.from({ length: particleCount }).map((_, i) => (
        <mesh key={i} ref={(el) => (particlesRef.current[i] = el)}>
          <sphereGeometry args={[1, 14, 14]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.2}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * UNIQUE 3D Residential House Digital Twin
 * The 3D House is the hero. All annotations are lightweight, semi-transparent glassmorphic badges.
 */
export default function ResidentialHouse3D({
  solarKw = 4.8,
  loadKw = 2.6,
  batterySoc = 68,
  batteryCapacity = 10,
  batteryPowerKw = 0, // + charging, - discharging
  gridPowerKw = 0, // + export, - import
  p2pPowerKw = 0, // + sell, - buy
  appliances = {
    ac: true,
    fridge: true,
    livingRoom: true,
    kitchen: true,
    washingMachine: false,
  },
  cloudCover = false,
  timeHour = 12,
  selectedElement = null,
  onSelectElement = () => {},
}) {
  const houseGroupRef = useRef();
  const acBladesRef = useRef();
  const washerDrumRef = useRef();
  const tvScreenRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (acBladesRef.current && appliances.ac) {
      acBladesRef.current.rotation.z = t * 7;
    }
    if (washerDrumRef.current && appliances.washingMachine) {
      washerDrumRef.current.rotation.z = t * 8;
    }
    if (tvScreenRef.current && appliances.livingRoom) {
      tvScreenRef.current.material.color.setHSL(0.58, 0.8, 0.45 + Math.sin(t * 3) * 0.05);
    }
  });

  // State checks for dynamic energy conduits
  const isSolarGenerating = solarKw > 0.05;
  const isBatteryCharging = batteryPowerKw > 0.05;
  const isBatteryDischarging = batteryPowerKw < -0.05;
  const isGridExporting = gridPowerKw > 0.05;
  const isGridImporting = gridPowerKw < -0.05;
  const isP2PSelling = p2pPowerKw > 0.05;
  const isP2PBuying = p2pPowerKw < -0.05;

  // Spatial Coordinates: Outer nodes pushed outward to create clear visual hierarchy
  const POS = {
    solarRoof: [0, 2.9, 0.2],
    homeBattery: [-2.2, 0.85, 0.2],
    smartMeter: [1.9, 0.85, 1.5],
    gridPole: [4.6, 2.0, 1.8],
    p2pGateway: [-4.6, 2.0, -1.5],
    livingRoom: [0.7, 0.55, 0.6],
    kitchen: [-0.8, 0.55, 0.6],
    acUnit: [0.7, 1.9, -0.4],
    fridge: [-1.2, 0.65, 0.2],
    washingMachine: [-1.3, 0.5, -0.8],
    evCar: [2.6, 0.45, -0.8],
  };

  return (
    <group ref={houseGroupRef} position={[0, -0.6, 0]}>
      {/* ==================== 1. FOUNDATION & GROUNDS ==================== */}
      {/* Outer Ground Plane */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[11.5, 0.1, 9.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Paved Perimeter */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[7.6, 0.06, 6.4]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* House Concrete Plinth */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[4.8, 0.15, 4.0]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>

      {/* Driveway Base */}
      <mesh position={[2.6, 0.06, -0.8]} receiveShadow>
        <boxGeometry args={[1.8, 0.08, 2.6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* Pathway */}
      <mesh position={[0.6, 0.06, 2.3]} receiveShadow>
        <boxGeometry args={[1.0, 0.06, 1.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.6} />
      </mesh>

      {/* ==================== 2. CUTAWAY ARCHITECTURAL STRUCTURE ==================== */}
      {/* Back Wall */}
      <mesh position={[0, 1.35, -1.95]} receiveShadow>
        <boxGeometry args={[4.6, 2.4, 0.1]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>

      {/* Left Wall (Cutaway partial) */}
      <mesh position={[-2.35, 1.35, 0]} receiveShadow>
        <boxGeometry args={[0.1, 2.4, 3.9]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} />
      </mesh>

      {/* Right Wall (Cutaway partial) */}
      <mesh position={[2.35, 1.35, -0.8]} receiveShadow>
        <boxGeometry args={[0.1, 2.4, 2.3]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>

      {/* Floor Slab / Second Story Base */}
      <mesh position={[0.2, 1.35, -0.2]} receiveShadow>
        <boxGeometry args={[4.2, 0.1, 3.4]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
      </mesh>

      {/* Semi-transparent Divider */}
      <mesh position={[-0.2, 0.7, 0.3]} receiveShadow>
        <boxGeometry args={[0.08, 1.1, 2.4]} />
        <meshStandardMaterial color="#94a3b8" opacity={0.6} transparent roughness={0.3} />
      </mesh>

      {/* Front Glass Railing */}
      <mesh position={[0.2, 0.4, 1.95]}>
        <boxGeometry args={[4.2, 0.45, 0.04]} />
        <meshStandardMaterial color="#38bdf8" opacity={0.3} transparent roughness={0.1} />
      </mesh>

      {/* ==================== 3. ROOFTOP SOLAR ARRAY (HERO) ==================== */}
      <group
        position={POS.solarRoof}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement('solar');
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}
      >
        {/* Main Angled Roof Truss */}
        <mesh position={[0, -0.15, -0.2]} rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[4.4, 0.1, 3.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>

        {/* 6 Photovoltaic Solar Panels */}
        {[-1.4, -0.5, 0.5, 1.4].map((x, colIdx) =>
          [-0.6, 0.3].map((z, rowIdx) => {
            const panelGlow = isSolarGenerating && !cloudCover ? '#2563eb' : '#1e3a8a';
            return (
              <group key={`${colIdx}-${rowIdx}`} position={[x, -0.05 + (z > 0 ? 0.3 : 0), z]} rotation={[-0.32, 0, 0]}>
                <mesh>
                  <boxGeometry args={[0.82, 0.04, 0.75]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0.025, 0]}>
                  <boxGeometry args={[0.78, 0.015, 0.71]} />
                  <meshStandardMaterial
                    color={panelGlow}
                    metalness={0.9}
                    roughness={0.15}
                    emissive={isSolarGenerating ? (cloudCover ? '#1e3a8a' : '#2563eb') : '#000000'}
                    emissiveIntensity={isSolarGenerating ? (cloudCover ? 0.3 : 0.7) : 0}
                  />
                </mesh>
              </group>
            );
          })
        )}

        {/* Minimal Glassmorphic Label (Offset upward away from panels) */}
        <Html position={[0, 1.25, 0]} center distanceFactor={15} zIndexRange={[12, 0]}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement('solar');
            }}
            className={`cursor-pointer select-none rounded-full px-2.5 py-0.5 backdrop-blur-md border transition-all text-center ${
              selectedElement === 'solar'
                ? 'bg-amber-500/90 text-white border-amber-300 ring-2 ring-amber-400 shadow-md'
                : 'bg-slate-950/50 text-amber-300 border-white/10 hover:bg-slate-900/80 shadow-xs'
            }`}
          >
            <span className="font-bold text-[10.5px] whitespace-nowrap">
              ☀ Solar PV • {solarKw.toFixed(1)} kW {cloudCover ? '(☁ Clouded)' : ''}
            </span>
          </div>
        </Html>
      </group>

      {/* ==================== 4. HOME WALL BATTERY (HERO) ==================== */}
      <group
        position={POS.homeBattery}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement('battery');
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}
      >
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[0.65, 1.25, 0.06]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
        </mesh>

        <mesh position={[0, 0, 0.05]} castShadow>
          <boxGeometry args={[0.55, 1.15, 0.2]} />
          <meshStandardMaterial
            color={selectedElement === 'battery' ? '#ffffff' : '#f8fafc'}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>

        <mesh position={[0, 0, 0.155]}>
          <boxGeometry args={[0.48, 1.05, 0.02]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>

        {/* Vertical Glowing SOC LED Strip */}
        <mesh position={[0.18, 0, 0.168]}>
          <boxGeometry args={[0.04, 0.9 * (batterySoc / 100), 0.01]} />
          <meshStandardMaterial
            color={batterySoc > 40 ? '#10b981' : batterySoc > 20 ? '#f59e0b' : '#ef4444'}
            emissive={batterySoc > 40 ? '#10b981' : batterySoc > 20 ? '#f59e0b' : '#ef4444'}
            emissiveIntensity={1.0}
          />
        </mesh>

        {/* Minimal Glassmorphic Label (Offset upward & outward) */}
        <Html position={[-0.4, 0.95, 0]} center distanceFactor={15} zIndexRange={[12, 0]}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement('battery');
            }}
            className={`cursor-pointer select-none rounded-full px-2.5 py-0.5 backdrop-blur-md border transition-all text-center ${
              selectedElement === 'battery'
                ? 'bg-emerald-600/90 text-white border-emerald-300 ring-2 ring-emerald-400 shadow-md'
                : 'bg-slate-950/50 text-emerald-300 border-white/10 hover:bg-slate-900/80 shadow-xs'
            }`}
          >
            <span className="font-bold text-[10px] whitespace-nowrap">
              🔋 Home Battery • {batterySoc.toFixed(0)}%
              {isBatteryCharging ? ` (+${batteryPowerKw.toFixed(1)}kW)` : isBatteryDischarging ? ` (${batteryPowerKw.toFixed(1)}kW)` : ''}
            </span>
          </div>
        </Html>
      </group>

      {/* ==================== 5. SMART BI-DIRECTIONAL ENERGY METER ==================== */}
      <group
        position={POS.smartMeter}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement('meter');
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}
      >
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.45, 0.15]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.05, 0.08]}>
          <boxGeometry args={[0.26, 0.18, 0.02]} />
          <meshStandardMaterial
            color="#059669"
            emissive={isGridExporting ? '#059669' : isGridImporting ? '#d97706' : '#059669'}
            emissiveIntensity={0.6}
            roughness={0.2}
          />
        </mesh>

        {/* Minimal Glassmorphic Label */}
        <Html position={[0.4, 0.6, 0]} center distanceFactor={15} zIndexRange={[12, 0]}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement('meter');
            }}
            className={`cursor-pointer select-none rounded-full px-2.5 py-0.5 backdrop-blur-md border transition-all text-center ${
              selectedElement === 'meter'
                ? 'bg-blue-600/90 text-white border-blue-300 ring-2 ring-blue-400 shadow-md'
                : 'bg-slate-950/50 text-blue-300 border-white/10 hover:bg-slate-900/80 shadow-xs'
            }`}
          >
            <span className="font-bold text-[10px] whitespace-nowrap">
              ⚡ Smart Meter • {isGridExporting ? `EXP +${gridPowerKw.toFixed(1)}kW` : isGridImporting ? `IMP ${Math.abs(gridPowerKw).toFixed(1)}kW` : '230V OK'}
            </span>
          </div>
        </Html>
      </group>

      {/* ==================== 6. APPLIANCES & INTERIOR VISUALS (WITHOUT CLUTTER) ==================== */}

      {/* Unified Minimalist House Load Badge */}
      <Html position={[POS.livingRoom[0], 1.0, POS.livingRoom[2]]} center distanceFactor={15} zIndexRange={[12, 0]}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectElement('load');
          }}
          className={`cursor-pointer select-none rounded-full px-2.5 py-0.5 backdrop-blur-md border transition-all ${
            selectedElement === 'load'
              ? 'bg-cyan-600/90 text-white border-cyan-300 ring-2 ring-cyan-400'
              : 'bg-slate-950/50 text-cyan-300 border-white/10 hover:bg-slate-900/80'
          }`}
        >
          <span className="font-bold text-[10px] whitespace-nowrap">
            🏠 Home Load • {loadKw.toFixed(1)} kW
          </span>
        </div>
      </Html>

      {/* --- A. Air Conditioner (AC) --- */}
      <group
        position={POS.acUnit}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement('ac');
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}
      >
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.7, 0.25, 0.2]} />
          <meshStandardMaterial color={appliances.ac ? '#ffffff' : '#64748b'} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.08, 0.08]}>
          <boxGeometry args={[0.6, 0.04, 0.05]} />
          <meshStandardMaterial
            color={appliances.ac ? '#38bdf8' : '#334155'}
            emissive={appliances.ac ? '#0284c7' : '#000000'}
            emissiveIntensity={appliances.ac ? 0.9 : 0}
          />
        </mesh>
        <mesh ref={acBladesRef} position={[0.22, 0.02, 0.11]}>
          <circleGeometry args={[0.04, 8]} />
          <meshBasicMaterial color={appliances.ac ? '#38bdf8' : '#64748b'} />
        </mesh>
      </group>

      {/* --- B. Living Room & TV --- */}
      <group
        position={POS.livingRoom}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement('livingRoom');
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}
      >
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.9, 0.25, 0.45]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.35, -0.18]}>
          <boxGeometry args={[0.9, 0.3, 0.12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.12, 0.6]}>
          <boxGeometry args={[0.8, 0.2, 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <mesh ref={tvScreenRef} position={[0, 0.38, 0.6]}>
          <boxGeometry args={[0.65, 0.35, 0.03]} />
          <meshStandardMaterial
            color={appliances.livingRoom ? '#38bdf8' : '#0f172a'}
            emissive={appliances.livingRoom ? '#0284c7' : '#000000'}
            emissiveIntensity={appliances.livingRoom ? 0.7 : 0}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* --- C. Kitchen & Smart Refrigerator --- */}
      <group
        position={POS.fridge}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement('fridge');
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}
      >
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.38, 0.75, 0.35]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.08, 0.45, 0.18]}>
          <boxGeometry args={[0.08, 0.12, 0.01]} />
          <meshStandardMaterial
            color={appliances.fridge ? '#10b981' : '#475569'}
            emissive={appliances.fridge ? '#10b981' : '#000000'}
            emissiveIntensity={appliances.fridge ? 0.8 : 0}
          />
        </mesh>
        <mesh position={[0.4, 0.18, 0]}>
          <boxGeometry args={[0.45, 0.4, 0.35]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
      </group>

      {/* --- D. Smart Washing Machine --- */}
      <group
        position={POS.washingMachine}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement('washingMachine');
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}
      >
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.35, 0.42, 0.35]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh ref={washerDrumRef} position={[0, 0.2, 0.18]}>
          <circleGeometry args={[0.1, 16]} />
          <meshStandardMaterial
            color={appliances.washingMachine ? '#38bdf8' : '#334155'}
            emissive={appliances.washingMachine ? '#0284c7' : '#000000'}
            emissiveIntensity={appliances.washingMachine ? 0.7 : 0}
          />
        </mesh>
      </group>

      {/* --- E. EV in Carport --- */}
      <group position={POS.evCar}>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.9, 0.3, 1.6]} />
          <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.36, -0.1]}>
          <boxGeometry args={[0.75, 0.22, 0.9]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
        </mesh>
        {[-0.45, 0.45].map((wx, i) =>
          [-0.5, 0.5].map((wz, j) => (
            <mesh key={`${i}-${j}`} position={[wx, 0.08, wz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
          ))
        )}
        <mesh position={[-0.6, 0.4, 0.6]}>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#334155" roughness={0.4} />
        </mesh>
        <mesh position={[-0.6, 0.65, 0.65]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* ==================== 7. OUTER RIGHT: UTILITY GRID TRANSMISSION POLE ==================== */}
      <group position={POS.gridPole}>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 3.2, 12]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[1.1, 0.06, 0.06]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.6} />
        </mesh>
        {[-0.4, 0, 0.4].map((cx, idx) => (
          <mesh key={idx} position={[cx, 0.88, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.1, 8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.2} />
          </mesh>
        ))}

        <Html position={[0, 1.4, 0]} center distanceFactor={15} zIndexRange={[12, 0]}>
          <div className="select-none rounded-full px-2 py-0.5 backdrop-blur-md bg-slate-950/50 border border-white/10 text-[9.5px] font-semibold text-slate-300 shadow-xs">
            🌐 Utility Grid (₹6.10/kWh)
          </div>
        </Html>
      </group>

      {/* ==================== 8. OUTER LEFT: P2P COMMUNITY GATEWAY ==================== */}
      <group position={POS.p2pGateway}>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 3.0, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={1.0} />
        </mesh>

        <Html position={[0, 1.4, 0]} center distanceFactor={15} zIndexRange={[12, 0]}>
          <div className="select-none rounded-full px-2 py-0.5 backdrop-blur-md bg-slate-950/50 border border-purple-500/20 text-[9.5px] font-semibold text-purple-300 shadow-xs">
            🤝 P2P Microgrid (₹4.50/kWh)
          </div>
        </Html>
      </group>

      {/* ==================== 9. HIGH-VISIBILITY 3D ENERGY FLOW PATHS ==================== */}

      {/* A. Solar -> House Load (Direct PV consumption) */}
      <EnergyFlowStream
        start={POS.solarRoof}
        end={POS.livingRoom}
        color="#fbbf24"
        rate={Math.min(solarKw, loadKw) * 0.7}
        active={isSolarGenerating && loadKw > 0}
        curveHeight={0.4}
        particleCount={8}
        pulseSize={0.13}
      />

      {/* B. Solar -> Home Battery (Charging) */}
      <EnergyFlowStream
        start={POS.solarRoof}
        end={POS.homeBattery}
        color="#34d399"
        rate={batteryPowerKw * 0.9}
        active={isSolarGenerating && isBatteryCharging}
        curveHeight={0.6}
        particleCount={9}
        pulseSize={0.14}
      />

      {/* C. Home Battery -> House Load (Discharging) */}
      <EnergyFlowStream
        start={POS.homeBattery}
        end={POS.livingRoom}
        color="#10b981"
        rate={Math.abs(batteryPowerKw) * 0.9}
        active={isBatteryDischarging}
        curveHeight={0.35}
        particleCount={9}
        pulseSize={0.14}
      />

      {/* D. House / Solar -> Smart Meter -> Grid (Exporting) */}
      <EnergyFlowStream
        start={POS.solarRoof}
        end={POS.smartMeter}
        color="#38bdf8"
        rate={gridPowerKw * 0.8}
        active={isGridExporting}
        curveHeight={0.5}
        particleCount={7}
        pulseSize={0.12}
      />
      <EnergyFlowStream
        start={POS.smartMeter}
        end={POS.gridPole}
        color="#38bdf8"
        rate={gridPowerKw * 0.8}
        active={isGridExporting}
        curveHeight={0.9}
        particleCount={9}
        pulseSize={0.14}
      />

      {/* E. Grid -> Smart Meter -> House Load (Importing) */}
      <EnergyFlowStream
        start={POS.gridPole}
        end={POS.smartMeter}
        color="#f97316"
        rate={Math.abs(gridPowerKw) * 0.8}
        active={isGridImporting}
        curveHeight={0.9}
        particleCount={9}
        pulseSize={0.14}
      />
      <EnergyFlowStream
        start={POS.smartMeter}
        end={POS.livingRoom}
        color="#f97316"
        rate={Math.abs(gridPowerKw) * 0.8}
        active={isGridImporting}
        curveHeight={0.4}
        particleCount={7}
        pulseSize={0.12}
      />

      {/* F. P2P Marketplace Trade Streams */}
      {/* Selling: House -> P2P Gateway */}
      <EnergyFlowStream
        start={POS.solarRoof}
        end={POS.p2pGateway}
        color="#c084fc"
        rate={p2pPowerKw * 0.9}
        active={isP2PSelling}
        curveHeight={1.0}
        particleCount={9}
        pulseSize={0.14}
      />
      {/* Buying: P2P Gateway -> House Load */}
      <EnergyFlowStream
        start={POS.p2pGateway}
        end={POS.livingRoom}
        color="#c084fc"
        rate={Math.abs(p2pPowerKw) * 0.9}
        active={isP2PBuying}
        curveHeight={1.0}
        particleCount={9}
        pulseSize={0.14}
      />
    </group>
  );
}
