'use client';
import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function ShaderScene() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const { size } = useThree();

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      matRef.current.uniforms.uResolution.value.set(size.width, size.height);
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[4, 4]} />
      <shaderMaterial
        ref={matRef}
        uniforms={{
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec2 uResolution;
          varying vec2 vUv;
          void main() {
            vec2 uv = (vUv - 0.5) * 2.0;
            float wave = sin(uv.x * 10.0 + uTime * 5.0) * 0.5 + 0.5;
            vec3 col = 0.5 + 0.5 * cos(uTime + vec3(0, 1, 2) + wave * 3.0);
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-black">
      <div className="w-[500px] h-[500px] border-4 border-white rounded-lg">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <color attach="background" args={['black']} />
          <ShaderScene />
        </Canvas>
      </div>
    </main>
  );
}
