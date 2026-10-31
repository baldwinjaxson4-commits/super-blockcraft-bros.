import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getGame } from "../game";

const C = {
  cap: "#8a3c14",
  capDark: "#6a2a0c",
  face: "#f2c890",
  feet: "#1c1208",
  white: "#ffffff",
  black: "#141414",
};

function Part({ size, pos, color }: { size: [number, number, number]; pos: [number, number, number]; color: string }) {
  return (
    <mesh position={pos} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Mushling({ index }: { index: number }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const footL = useRef<THREE.Mesh>(null);
  const footR = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const w = getGame().world;
    const e = w.enemies[index];
    if (!root.current || !body.current || !e) return;
    root.current.visible = e.state !== "dead";
    if (!root.current.visible) return;
    root.current.position.set(e.x, e.y, 0);
    const squashed = e.state === "squashed";
    body.current.scale.set(1, squashed ? 0.3 : 1, 1);
    body.current.rotation.z = e.state === "flipped" ? Math.PI : 0;
    body.current.position.y = e.state === "flipped" ? 0.85 : 0;
    body.current.rotation.y = e.vx > 0 ? 0.5 : -0.5;
    const step = Math.sin(w.elapsed * 12 + index) > 0 ? 1 : -1;
    const walking = e.state === "walk";
    if (footL.current) footL.current.position.y = walking && step > 0 ? 0.12 : 0.07;
    if (footR.current) footR.current.position.y = walking && step < 0 ? 0.12 : 0.07;
  });

  return (
    <group ref={root}>
      <group ref={body}>
        <mesh ref={footL} position={[-0.22, 0.07, 0.05]} castShadow>
          <boxGeometry args={[0.3, 0.14, 0.4]} />
          <meshStandardMaterial color={C.feet} roughness={0.9} />
        </mesh>
        <mesh ref={footR} position={[0.22, 0.07, 0.05]} castShadow>
          <boxGeometry args={[0.3, 0.14, 0.4]} />
          <meshStandardMaterial color={C.feet} roughness={0.9} />
        </mesh>
        <Part size={[0.5, 0.26, 0.5]} pos={[0, 0.27, 0]} color={C.face} />
        <Part size={[0.86, 0.46, 0.86]} pos={[0, 0.6, 0]} color={C.cap} />
        <Part size={[0.6, 0.12, 0.6]} pos={[0, 0.88, 0]} color={C.capDark} />
        <Part size={[0.6, 0.22, 0.04]} pos={[0, 0.5, 0.43]} color={C.face} />
        <Part size={[0.14, 0.18, 0.03]} pos={[-0.15, 0.6, 0.45]} color={C.white} />
        <Part size={[0.14, 0.18, 0.03]} pos={[0.15, 0.6, 0.45]} color={C.white} />
        <Part size={[0.07, 0.1, 0.03]} pos={[-0.13, 0.58, 0.47]} color={C.black} />
        <Part size={[0.07, 0.1, 0.03]} pos={[0.13, 0.58, 0.47]} color={C.black} />
        <Part size={[0.2, 0.05, 0.03]} pos={[-0.15, 0.73, 0.45]} color={C.black} />
        <Part size={[0.2, 0.05, 0.03]} pos={[0.15, 0.73, 0.45]} color={C.black} />
      </group>
    </group>
  );
}

export function Enemies() {
  const count = getGame().world.enemies.length;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Mushling key={i} index={i} />
      ))}
    </>
  );
}
