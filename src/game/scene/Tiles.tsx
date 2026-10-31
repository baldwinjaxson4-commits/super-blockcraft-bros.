import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getGame } from "../game";
import { T } from "../sim/level";
import { BUMP_TIME } from "../sim/world";
import { BOX, getMaterials } from "./textures";

const GROUND_DEPTH = [-1, 0, 1];
const M = new THREE.Matrix4();

type Key = "grass" | "dirt" | "brick" | "question" | "used" | "stone";
const KEYS: Key[] = ["grass", "dirt", "brick", "question", "used", "stone"];

/** Draws every collision tile as instanced, textured cubes. Rebuilt when blocks change. */
export function Tiles() {
  const mats = getMaterials();
  const refs = useRef<Partial<Record<Key, THREE.InstancedMesh>>>({});
  const last = useRef({ version: -1, bumping: false });

  const capacity = useMemo(() => {
    const { level } = getGame().world;
    const c: Record<Key, number> = { grass: 0, dirt: 0, brick: 0, question: 0, used: 0, stone: 0 };
    for (const t of level.tiles) {
      if (t === T.GROUND) {
        c.grass += GROUND_DEPTH.length;
        c.dirt += GROUND_DEPTH.length * 2;
      } else if (t === T.BRICK) c.brick++;
      else if (t === T.QCOIN || t === T.QPOWER) {
        c.question++;
        c.used++;
      } else if (t === T.USED) c.used++;
      else if (t === T.STONE) c.stone++;
    }
    for (const k of KEYS) c[k] = Math.max(1, c[k]);
    return c;
  }, []);

  useFrame((state) => {
    const w = getGame().world;
    mats.question.emissiveIntensity = 0.08 + 0.12 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4));
    const bumping = w.bumps.length > 0;
    if (w.tilesVersion === last.current.version && !bumping && !last.current.bumping) return;
    last.current = { version: w.tilesVersion, bumping };

    const counts: Record<Key, number> = { grass: 0, dirt: 0, brick: 0, question: 0, used: 0, stone: 0 };
    const { width, height } = w.level;
    const push = (k: Key, x: number, y: number, z: number) => {
      const mesh = refs.current[k];
      if (!mesh || counts[k] >= capacity[k]) return;
      M.makeTranslation(x, y, z);
      mesh.setMatrixAt(counts[k]++, M);
    };
    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        const t = w.tiles[ty * width + tx];
        if (t === T.EMPTY || t === T.PIPE) continue;
        let off = 0;
        for (const b of w.bumps) {
          if (b.tx === tx && b.ty === ty) off = Math.sin((b.t / BUMP_TIME) * Math.PI) * 0.35;
        }
        const x = tx + 0.5;
        const y = ty + 0.5 + off;
        if (t === T.GROUND) {
          const above = ty + 1 < height ? w.tiles[(ty + 1) * width + tx] : T.EMPTY;
          const k: Key = above === T.GROUND ? "dirt" : "grass";
          for (const z of GROUND_DEPTH) push(k, x, y, z);
          // Extra dirt below the bottom row so the ground never shows sky under it.
          if (ty === 0) for (const z of GROUND_DEPTH) push("dirt", x, -0.5, z);
        } else if (t === T.BRICK) push("brick", x, y, 0);
        else if (t === T.QCOIN || t === T.QPOWER) push("question", x, y, 0);
        else if (t === T.USED) push("used", x, y, 0);
        else if (t === T.STONE) push("stone", x, y, 0);
      }
    }
    for (const k of KEYS) {
      const mesh = refs.current[k];
      if (!mesh) continue;
      mesh.count = counts[k];
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, -0.5);

  return (
    <>
      {KEYS.map((k) => (
        <instancedMesh
          key={k}
          ref={(m) => {
            if (m) refs.current[k] = m;
          }}
          args={[BOX, mats[k] as THREE.Material | THREE.Material[], capacity[k]]}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

/** Green warp pipes drawn as Minecraft-style square pipes. */
export function Pipes() {
  const mats = getMaterials();
  const pipes = getGame().world.level.pipes;
  return (
    <>
      {pipes.map((p) => {
        const cx = p.x + 1;
        const bodyH = p.h - 0.9;
        return (
          <group key={p.x}>
            <mesh
              geometry={BOX}
              material={mats.pipe}
              position={[cx, p.base + bodyH / 2, 0]}
              scale={[1.8, bodyH, 1.8]}
              castShadow
              receiveShadow
            />
            <mesh
              geometry={BOX}
              material={mats.pipeLip}
              position={[cx, p.base + p.h - 0.45, 0]}
              scale={[2.1, 0.9, 2.1]}
              castShadow
              receiveShadow
            />
          </group>
        );
      })}
    </>
  );
}
