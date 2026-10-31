import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getGame } from "../game";
import { T } from "../sim/level";
import { getMaterials } from "./textures";

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const S = new THREE.Vector3(1, 1, 1);
const P = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
const COIN_GEO = new THREE.BoxGeometry(0.5, 0.7, 0.14);
const DEBRIS_GEO = new THREE.BoxGeometry(0.4, 0.4, 0.4);

/** Floating coins, coins popping out of ? blocks and brick debris. */
export function Coins() {
  const mats = getMaterials();
  const coinsRef = useRef<THREE.InstancedMesh>(null);
  const fxRef = useRef<THREE.InstancedMesh>(null);
  const debrisRef = useRef<THREE.InstancedMesh>(null);
  const cap = getGame().world.coins.length;

  useFrame(() => {
    const w = getGame().world;
    const spin = w.elapsed * 3;
    if (coinsRef.current) {
      let n = 0;
      for (const c of w.coins) {
        if (c.taken) continue;
        Q.setFromAxisAngle(Y, spin + c.x * 0.3);
        M.compose(P.set(c.x, c.y + Math.sin(w.elapsed * 3 + c.x) * 0.06, 0), Q, S);
        coinsRef.current.setMatrixAt(n++, M);
      }
      coinsRef.current.count = n;
      coinsRef.current.instanceMatrix.needsUpdate = true;
    }
    if (fxRef.current && debrisRef.current) {
      let nc = 0,
        nd = 0;
      for (const e of w.effects) {
        if (e.kind === "coin" && nc < 16) {
          Q.setFromAxisAngle(Y, e.t * 30);
          M.compose(P.set(e.x, e.y, 0), Q, S);
          fxRef.current.setMatrixAt(nc++, M);
        } else if (e.kind === "debris" && nd < 32) {
          Q.setFromAxisAngle(Y, e.t * 10);
          M.compose(P.set(e.x, e.y, 0.2), Q, S);
          debrisRef.current.setMatrixAt(nd++, M);
        }
      }
      fxRef.current.count = nc;
      debrisRef.current.count = nd;
      fxRef.current.instanceMatrix.needsUpdate = true;
      debrisRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={coinsRef} args={[COIN_GEO, mats.coin, Math.max(1, cap)]} frustumCulled={false} castShadow />
      <instancedMesh ref={fxRef} args={[COIN_GEO, mats.coin, 16]} frustumCulled={false} />
      <instancedMesh ref={debrisRef} args={[DEBRIS_GEO, mats.brick, 32]} frustumCulled={false} castShadow />
    </>
  );
}

function MushroomModel({ index }: { index: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const m = getGame().world.mushrooms[index];
    if (!ref.current) return;
    ref.current.visible = !!m && m.state !== "gone";
    if (m) ref.current.position.set(m.x, m.y, 0);
  });
  return (
    <group ref={ref} visible={false}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color="#f5deb3" roughness={0.9} />
      </mesh>
      <mesh position={[-0.1, 0.24, 0.26]}>
        <boxGeometry args={[0.07, 0.14, 0.02]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0.1, 0.24, 0.26]}>
        <boxGeometry args={[0.07, 0.14, 0.02]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[0.8, 0.4, 0.8]} />
        <meshStandardMaterial color="#e0281e" roughness={0.8} />
      </mesh>
      {[
        [0, 0.66, 0.41],
        [-0.41, 0.6, 0],
        [0.41, 0.6, 0],
        [0, 0.79, 0],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <boxGeometry args={[0.26, 0.22, 0.26]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function Mushrooms() {
  const count = useMemo(() => getGame().world.level.tiles.filter((t) => t === T.QPOWER).length, []);
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <MushroomModel key={i} index={i} />
      ))}
    </>
  );
}
