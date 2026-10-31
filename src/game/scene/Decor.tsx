import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getGame } from "../game";
import { BOX, getMaterials } from "./textures";

type V3 = [number, number, number];

function Instances({
  positions,
  material,
  shadows = false,
}: {
  positions: V3[];
  material: THREE.Material | THREE.Material[];
  shadows?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    positions.forEach((p, i) => ref.current?.setMatrixAt(i, m.makeTranslation(p[0], p[1], p[2])));
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [positions]);
  return (
    <instancedMesh
      ref={ref}
      args={[BOX, material, Math.max(1, positions.length)]}
      frustumCulled={false}
      castShadow={shadows}
      receiveShadow={shadows}
    />
  );
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildDecor(width: number, gaps: [number, number][], castleX: number) {
  const r = rng(7);
  const inGap = (x: number) => gaps.some(([a, b]) => x >= a - 1 && x < b + 1);
  const grass: V3[] = [];
  const dirt: V3[] = [];
  const leaves: V3[] = [];
  const logs: V3[] = [];
  const clouds: V3[] = [];
  const bricks: V3[] = [];
  const dark: V3[] = [];

  // Stepped voxel hills far behind the play lane.
  for (let hx = 0; hx < width; hx += 24 + Math.floor(r() * 10)) {
    const size = r() < 0.5 ? 4 : 3;
    for (let level = 0; level < size; level++) {
      const half = size - level;
      for (let dx = -half; dx <= half; dx++) {
        const top = level === size - 1 || Math.abs(dx) === half;
        for (const z of [-6, -7]) (top ? grass : dirt).push([hx + dx + 0.5, 2 + level + 0.5, z]);
      }
    }
  }
  // Ground strip behind the hills so they don't float.
  // Oak trees.
  for (let tx = 9; tx < castleX - 8; tx += 17 + Math.floor(r() * 12)) {
    if (inGap(tx)) continue;
    const z = -3;
    const trunk = 3 + Math.floor(r() * 2);
    for (let y = 0; y < trunk; y++) logs.push([tx + 0.5, 2.5 + y, z]);
    const ly = 2 + trunk;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (let dy = -1; dy <= 0; dy++) {
          if (Math.abs(dx) === 2 && dy === 0) continue;
          leaves.push([tx + dx + 0.5, ly + dy + 0.5, z + dz]);
        }
    for (let dx = -1; dx <= 1; dx++) leaves.push([tx + dx + 0.5, ly + 1.5, z]);
  }
  // Bushes along the back row of the ground.
  for (let bx = 4; bx < castleX - 6; bx += 11 + Math.floor(r() * 9)) {
    if (inGap(bx)) continue;
    const len = 2 + Math.floor(r() * 3);
    for (let dx = 0; dx < len; dx++) {
      leaves.push([bx + dx + 0.5, 2.5, -1]);
      if (dx > 0 && dx < len - 1) leaves.push([bx + dx + 0.5, 3.5, -1]);
    }
  }
  // Blocky clouds.
  for (let cx = 6; cx < width + 10; cx += 13 + Math.floor(r() * 10)) {
    const cy = 11 + Math.floor(r() * 3);
    const len = 3 + Math.floor(r() * 3);
    const z = -12 - Math.floor(r() * 4);
    for (let dx = 0; dx < len; dx++) {
      clouds.push([cx + dx, cy, z]);
      if (dx > 0 && dx < len - 1) clouds.push([cx + dx, cy + 1, z]);
    }
  }
  // Brick castle at the end.
  const c0 = Math.round(castleX - 2.5);
  for (let x = 0; x < 5; x++)
    for (let y = 0; y < 5; y++) {
      const door = x === 2 && y < 2;
      const win = (x === 1 || x === 3) && y === 3;
      (door || win ? dark : bricks).push([c0 + x + 0.5, 2.5 + y, -1]);
    }
  for (let x = 0; x < 5; x += 2) bricks.push([c0 + x + 0.5, 7.5, -1]);
  for (let x = 1; x < 4; x++) bricks.push([c0 + x + 0.5, 8.5, -1]);
  for (let x = 1; x < 4; x += 2) bricks.push([c0 + x + 0.5, 9.5, -1]);
  return { grass, dirt, leaves, logs, clouds, bricks, dark };
}

const DARK = new THREE.MeshStandardMaterial({ color: "#120a06", roughness: 1 });

/** Large grass field behind the play lane so background hills and trees sit on land. */
function Field({ width }: { width: number }) {
  const mat = useMemo(() => {
    const tex = getMaterials().grass[2]!.map!.clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(width + 40, 30);
    tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
  }, [width]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[width / 2, 1.99, -16.5]} material={mat} receiveShadow>
      <planeGeometry args={[width + 40, 30]} />
    </mesh>
  );
}

export function Decor() {
  const mats = getMaterials();
  const { level } = getGame().world;
  const d = useMemo(() => buildDecor(level.width, level.gaps, level.castleX), [level]);
  return (
    <>
      <Field width={level.width} />
      <Instances positions={d.grass} material={mats.grass} />
      <Instances positions={d.dirt} material={mats.dirt} />
      <Instances positions={d.leaves} material={mats.leaves} shadows />
      <Instances positions={d.logs} material={mats.log} shadows />
      <Instances positions={d.clouds} material={mats.cloud} />
      <Instances positions={d.bricks} material={mats.brick} shadows />
      <Instances positions={d.dark} material={DARK} />
      <FlagPole />
    </>
  );
}

function FlagPole() {
  const flag = useRef<THREE.Group>(null);
  const { level } = getGame().world;
  const poleX = level.flagX + 0.5;
  const top = level.flagTop + 1;
  useFrame((state) => {
    const w = getGame().world;
    if (!flag.current) return;
    flag.current.position.y = w.flagY;
    flag.current.rotation.y = Math.sin(state.clock.elapsedTime * 3) * 0.12;
  });
  return (
    <group>
      <mesh position={[poleX, (3 + top) / 2, 0]} castShadow>
        <boxGeometry args={[0.14, top - 3, 0.14]} />
        <meshStandardMaterial color="#cfe8cf" roughness={0.6} />
      </mesh>
      <mesh position={[poleX, top + 0.2, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#2e9e2e" roughness={0.6} />
      </mesh>
      <group ref={flag} position={[poleX, level.flagTop, 0]}>
        <mesh position={[-0.6, 0, 0]} castShadow>
          <boxGeometry args={[1.1, 0.8, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>
        <mesh position={[-0.6, 0, 0.04]}>
          <boxGeometry args={[0.4, 0.4, 0.04]} />
          <meshStandardMaterial color="#2e9e2e" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
