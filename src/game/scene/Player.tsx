import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getGame } from "../game";
import { BIG_H, SMALL_H } from "../sim/constants";

const MODEL_H = 1.9;
const BIG_SCALE = BIG_H / MODEL_H;
const SMALL_SCALE = SMALL_H / MODEL_H;

const COLORS = {
  red: "#d8261c",
  blue: "#2a4fc8",
  skin: "#f5c08a",
  brown: "#5a2e12",
  shoe: "#4a240c",
  white: "#f4f4f4",
  black: "#141414",
  gold: "#ffd23a",
};

function Vox({
  size,
  pos,
  color,
}: {
  size: [number, number, number];
  pos: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={pos} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

/** Blocky red-capped plumber hero. Built facing +z, 1.9 units tall, feet at y=0. */
export function Player() {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const anim = useRef({ scale: SMALL_SCALE, yaw: Math.PI / 2, phase: 0 });

  useFrame((_, delta) => {
    const w = getGame().world;
    const p = w.player;
    const a = anim.current;
    const dt = Math.min(delta, 0.05);
    if (!root.current || !body.current) return;

    root.current.position.set(p.x, p.y, 0);
    const targetScale = p.big ? BIG_SCALE : SMALL_SCALE;
    a.scale += (targetScale - a.scale) * (1 - Math.exp(-10 * dt));
    root.current.scale.setScalar(a.scale);

    const dying = w.status === "dying";
    const targetYaw = dying ? 0 : p.facing > 0 ? Math.PI / 2 - 0.4 : -Math.PI / 2 + 0.4;
    a.yaw += (targetYaw - a.yaw) * (1 - Math.exp(-14 * dt));
    body.current.rotation.y = a.yaw;

    const speed = Math.abs(p.vx);
    a.phase += speed * dt * 2.4;
    let lL = 0,
      lR = 0,
      aL = 0,
      aR = 0;
    if (dying) {
      aL = aR = -2.9;
    } else if (!p.onGround) {
      lL = -0.8;
      lR = 0.5;
      aR = -2.7;
      aL = 0.5;
    } else {
      const s = Math.sin(a.phase) * Math.min(1, speed / 4) * 0.9;
      lL = s;
      lR = -s;
      aL = -s * 0.8;
      aR = s * 0.8;
    }
    legL.current!.rotation.x = lL;
    legR.current!.rotation.x = lR;
    armL.current!.rotation.x = aL;
    armR.current!.rotation.x = aR;

    const blink = p.invuln > 0 && Math.floor(w.elapsed * 20) % 2 === 0;
    root.current.visible = p.visible && !blink;
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* legs (pivot at hip) */}
        <group ref={legL} position={[-0.17, 0.72, 0]}>
          <Vox size={[0.3, 0.55, 0.34]} pos={[0, -0.28, 0]} color={COLORS.blue} />
          <Vox size={[0.32, 0.2, 0.46]} pos={[0, -0.62, 0.06]} color={COLORS.shoe} />
        </group>
        <group ref={legR} position={[0.17, 0.72, 0]}>
          <Vox size={[0.3, 0.55, 0.34]} pos={[0, -0.28, 0]} color={COLORS.blue} />
          <Vox size={[0.32, 0.2, 0.46]} pos={[0, -0.62, 0.06]} color={COLORS.shoe} />
        </group>
        {/* torso */}
        <Vox size={[0.7, 0.56, 0.44]} pos={[0, 0.98, 0]} color={COLORS.red} />
        <Vox size={[0.72, 0.22, 0.46]} pos={[0, 0.8, 0]} color={COLORS.blue} />
        <Vox size={[0.46, 0.3, 0.04]} pos={[0, 1.02, 0.23]} color={COLORS.blue} />
        <Vox size={[0.08, 0.08, 0.04]} pos={[-0.15, 1.1, 0.26]} color={COLORS.gold} />
        <Vox size={[0.08, 0.08, 0.04]} pos={[0.15, 1.1, 0.26]} color={COLORS.gold} />
        {/* arms (pivot at shoulder) */}
        <group ref={armL} position={[-0.45, 1.2, 0]}>
          <Vox size={[0.2, 0.46, 0.24]} pos={[0, -0.2, 0]} color={COLORS.red} />
          <Vox size={[0.22, 0.2, 0.24]} pos={[0, -0.5, 0]} color={COLORS.white} />
        </group>
        <group ref={armR} position={[0.45, 1.2, 0]}>
          <Vox size={[0.2, 0.46, 0.24]} pos={[0, -0.2, 0]} color={COLORS.red} />
          <Vox size={[0.22, 0.2, 0.24]} pos={[0, -0.5, 0]} color={COLORS.white} />
        </group>
        {/* head */}
        <Vox size={[0.58, 0.52, 0.54]} pos={[0, 1.52, 0]} color={COLORS.skin} />
        <Vox size={[0.6, 0.3, 0.2]} pos={[0, 1.6, -0.2]} color={COLORS.brown} />
        <Vox size={[0.14, 0.14, 0.12]} pos={[0, 1.46, 0.32]} color={COLORS.skin} />
        <Vox size={[0.42, 0.08, 0.06]} pos={[0, 1.36, 0.29]} color={COLORS.brown} />
        <Vox size={[0.08, 0.12, 0.03]} pos={[-0.14, 1.6, 0.28]} color={COLORS.black} />
        <Vox size={[0.08, 0.12, 0.03]} pos={[0.14, 1.6, 0.28]} color={COLORS.black} />
        {/* cap */}
        <Vox size={[0.62, 0.18, 0.6]} pos={[0, 1.84, 0]} color={COLORS.red} />
        <Vox size={[0.62, 0.07, 0.24]} pos={[0, 1.77, 0.38]} color={COLORS.red} />
        <Vox size={[0.18, 0.14, 0.03]} pos={[0, 1.86, 0.31]} color={COLORS.white} />
      </group>
    </group>
  );
}
