import React, { useRef, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function CameraControls({
  preset = 'default',
  enableZoom = true,
  enablePan = true,
  enableRotate = true,
  minDistance = 3,
  maxDistance = 25,
  maxPolarAngle = Math.PI / 2.15,
  minPolarAngle = 0.1,
  target = [0, 0, 0],
}) {
  const controlsRef = useRef();
  const { camera } = useThree();

  useEffect(() => {
    if (!controlsRef.current) return;

    const presetPositions = {
      default: { pos: [0, 8, 12], target: [0, 0, 0] },
      overview: { pos: [0, 12, 14], target: [0, 0, 0] },
      flow: { pos: [0, 6, 9], target: [0, 0.5, 0] },
      battery: { pos: [3, 4, 6], target: [0, 1, 0] },
      chart: { pos: [0, 6, 11], target: [0, 1.5, 0] },
      side: { pos: [12, 5, 0], target: [0, 0, 0] },
    };

    const targetConfig = presetPositions[preset] || presetPositions.default;
    camera.position.set(...targetConfig.pos);
    controlsRef.current.target.set(...targetConfig.target);
    controlsRef.current.update();
  }, [preset, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      enableZoom={enableZoom}
      enablePan={enablePan}
      enableRotate={enableRotate}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={maxPolarAngle}
      minPolarAngle={minPolarAngle}
      target={target}
    />
  );
}
