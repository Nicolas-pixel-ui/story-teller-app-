"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";

function Stars(props: any) {
  const ref = useRef<any>(null);
  const [sphere, setSphere] = useState<Float32Array | null>(null);
  
  // Generate random points in a sphere - client side only to avoid hydration mismatch
  useEffect(() => {
    const count = 800;
    const points = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 1.2 + Math.random() * 0.5; // Radius between 1.2 and 1.7
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      points[i * 3] = x;
      points[i * 3 + 1] = y;
      points[i * 3 + 2] = z;
    }
    setSphere(points);
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  if (!sphere) return null;

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#a1a1aa"
          size={0.002} // Increased size slightly
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

export default function ParticleBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full opacity-50 dark:opacity-80 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 1] }}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
          failIfMajorPerformanceCaveat: true,
        }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          const onLost = (event: Event) => {
            event.preventDefault();
          };
          canvas.addEventListener("webglcontextlost", onLost, false);
        }}
      >
        <Stars />
      </Canvas>
    </div>
  );
}

