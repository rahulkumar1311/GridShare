import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import House3D from './House3D';
import Battery3D from './Battery3D';
import GridSubstation3D from './GridSubstation3D';
import EnergyFlowLines3D from './EnergyFlowLines3D';

// 3D Spatial Layout Coordinates
export const NODE_3D_POSITIONS = {
  house_a: [-4.5, 0, 1.2],
  house_b: [0.2, 0, 2.2],
  house_c: [-1.8, 0, -2.2],
  house_d: [2.8, 0, -1.2],
  house_e: [-5.2, 0, -1.8],
  COMMUNITY_BATTERY: [4.8, 0, 1.8],
  MAIN_UTILITY_GRID: [0.5, 0, -4.2],
};

function GroundNeighborhood() {
  return (
    <group position={[0, -0.01, 0]}>
      {/* Soft Ground Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>

      {/* Subtle Circular Grid Accent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[9.8, 10.0, 64]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[6.5, 6.55, 64]} />
        <meshBasicMaterial color="#e2e8f0" opacity={0.7} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[3.2, 3.25, 64]} />
        <meshBasicMaterial color="#e2e8f0" opacity={0.5} transparent />
      </mesh>

      {/* Subtle Interconnect Bus Conduit Rings on Ground */}
      <gridHelper args={[20, 20, '#cbd5e1', '#f1f5f9']} position={[0, 0.002, 0]} />
    </group>
  );
}

const CommunityScene3D = forwardRef(function CommunityScene3D(
  {
    households = [],
    batterySoc = 40,
    gridPrice = 6.10,
    activeFlows = [],
    selectedNode = 'house_a',
    onSelectNode,
  },
  ref
) {
  const controlsRef = useRef();

  // Expose camera reset to parent
  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (controlsRef.current) {
        controlsRef.current.reset();
      }
    },
  }));

  // Build telemetry lookup
  const nodeStats = {};
  households.forEach((h) => {
    nodeStats[h.household_id] = h;
  });

  const housesList = [
    { id: 'house_a', name: 'House A (Solar)', hasSolar: true },
    { id: 'house_b', name: 'House B (EV Load)', hasSolar: false },
    { id: 'house_c', name: 'House C (Solar)', hasSolar: true },
    { id: 'house_d', name: 'House D (Consumer)', hasSolar: false },
    { id: 'house_e', name: 'House E (Villa)', hasSolar: true },
  ];

  return (
    <div className="relative h-full w-full select-none bg-slate-50/50">
      <Canvas
        camera={{ position: [0, 9, 13], fov: 42 }}
        shadows
        className="h-full w-full"
        onPointerDown={() => {
          // If clicking background, deselect or keep
        }}
      >
        {/* Natural Studio Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[10, 15, 8]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={30}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[-8, 10, -8]} intensity={0.4} />

        {/* Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={22}
          maxPolarAngle={Math.PI / 2.15} // Prevent going below ground
          minPolarAngle={0.1}
          target={[0, 0.5, 0]}
        />

        {/* Ground */}
        <GroundNeighborhood />

        {/* 1. 3D Households */}
        {housesList.map((h) => {
          const stats = nodeStats[h.id] || {
            generation_kw: h.id === 'house_a' ? 6.8 : h.id === 'house_e' ? 5.2 : 0,
            consumption_kw: h.id === 'house_b' ? 4.0 : 2.0,
            net_energy_kw: h.id === 'house_a' ? 4.7 : h.id === 'house_b' ? -2.8 : 0,
            status: h.id === 'house_a' || h.id === 'house_e' ? 'SURPLUS' : h.id === 'house_b' || h.id === 'house_d' ? 'DEFICIT' : 'BALANCED',
          };
          const pos = NODE_3D_POSITIONS[h.id] || [0, 0, 0];

          return (
            <House3D
              key={h.id}
              id={h.id}
              name={h.name}
              position={pos}
              status={stats.status || 'BALANCED'}
              generationKw={stats.generation_kw || 0}
              consumptionKw={stats.consumption_kw || 0}
              netKw={stats.net_energy_kw || 0}
              isSelected={selectedNode === h.id}
              hasSolar={h.hasSolar}
              onClick={onSelectNode}
            />
          );
        })}

        {/* 2. Community Central Battery */}
        <Battery3D
          position={NODE_3D_POSITIONS['COMMUNITY_BATTERY']}
          soc={batterySoc}
          capacityKwh={50}
          isSelected={selectedNode === 'COMMUNITY_BATTERY'}
          onClick={onSelectNode}
        />

        {/* 3. Main Utility Grid Substation */}
        <GridSubstation3D
          position={NODE_3D_POSITIONS['MAIN_UTILITY_GRID']}
          gridPrice={gridPrice}
          isSelected={selectedNode === 'MAIN_UTILITY_GRID'}
          onClick={onSelectNode}
        />

        {/* 4. Dynamic 3D Spline Energy Flow Lines & Particles */}
        <EnergyFlowLines3D flows={activeFlows} />
      </Canvas>
    </div>
  );
});

export default CommunityScene3D;
