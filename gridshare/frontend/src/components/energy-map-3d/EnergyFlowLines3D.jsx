import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

function SingleFlowLine({ flow }) {
  const { start, end, kw, tariff, type, color = '#059669', isActive = true } = flow;
  const particlesGroupRef = useRef();

  // Create a 3D quadratic/catmull-rom curve with slight upward arch
  const { curve, lineGeometry, midPoint } = useMemo(() => {
    const p0 = new THREE.Vector3(start[0], start[1] + 0.5, start[2]);
    const p2 = new THREE.Vector3(end[0], end[1] + 0.5, end[2]);
    const mid = new THREE.Vector3(
      (p0.x + p2.x) / 2,
      Math.max(p0.y, p2.y) + 0.8,
      (p0.z + p2.z) / 2
    );
    const c = new THREE.QuadraticBezierCurve3(p0, mid, p2);
    const points = c.getPoints(32);
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return { curve: c, lineGeometry: geom, midPoint: mid };
  }, [start, end]);

  // Number of animated energy particles
  const particleCount = 5;
  const particleMeshes = useRef([]);

  useFrame(({ clock }) => {
    if (!isActive || !particlesGroupRef.current) return;
    const t = clock.getElapsedTime() * 0.45; // Speed factor

    particleMeshes.current.forEach((mesh, index) => {
      if (mesh) {
        // Distribute particles evenly along progress [0, 1]
        const offset = index / particleCount;
        const progress = (t + offset) % 1.0;
        const point = curve.getPoint(progress);
        mesh.position.copy(point);
        // Subtle pulse scale
        const scale = 0.12 + Math.sin(progress * Math.PI) * 0.05;
        mesh.scale.setScalar(scale);
      }
    });
  });

  return (
    <group>
      {/* 3D Conduit Line */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          color={isActive ? color : '#cbd5e1'}
          linewidth={isActive ? 2 : 1}
          opacity={isActive ? 0.85 : 0.4}
          transparent
        />
      </line>

      {/* Animated Traveling Energy Particles */}
      {isActive && (
        <group ref={particlesGroupRef}>
          {Array.from({ length: particleCount }).map((_, idx) => (
            <mesh
              key={idx}
              ref={(el) => (particleMeshes.current[idx] = el)}
            >
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
          ))}
        </group>
      )}

      {/* Floating 3D Flow Label at Midpoint */}
      {isActive && (
        <Html
          position={[midPoint.x, midPoint.y + 0.25, midPoint.z]}
          center
          distanceFactor={18}
          zIndexRange={[10, 0]}
          className="pointer-events-none select-none transition-all duration-200"
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            className="flex items-center space-x-1 rounded-full border border-white/35 px-1.5 py-0.2 shadow-none"
          >
            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span
              style={{
                textShadow: '0 1px 2px rgba(255,255,255,0.95), 0 0 3px rgba(255,255,255,0.9)',
              }}
              className="font-mono font-black text-[10px] text-slate-900 whitespace-nowrap"
            >
              {kw?.toFixed(1)} kW
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function EnergyFlowLines3D({ flows = [] }) {
  return (
    <group>
      {flows.map((flow) => (
        <SingleFlowLine key={flow.id} flow={flow} />
      ))}
    </group>
  );
}
