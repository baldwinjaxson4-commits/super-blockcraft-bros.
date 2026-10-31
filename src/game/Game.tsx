import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { beginOrRestart, getGame, useHud } from "./game";
import { playSfx, unlockAudio } from "./audio";
import { stepWorld, type Input } from "./sim/world";
import { Tiles, Pipes } from "./scene/Tiles";
import { Player } from "./scene/Player";
import { Enemies } from "./scene/Enemies";
import { Coins, Mushrooms } from "./scene/Items";
import { Decor } from "./scene/Decor";
import { Hud } from "./ui/Hud";

const CAM_HALF_WIDTH = 11;
const CAM_FOLLOW = 5;
const LOOK = new THREE.Vector3();

function readGamepad(): Input {
  const out: Input = { left: false, right: false, jump: false, run: false };
  const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    const ax = pad.axes[0] ?? 0;
    out.left ||= ax < -0.35 || !!pad.buttons[14]?.pressed;
    out.right ||= ax > 0.35 || !!pad.buttons[15]?.pressed;
    out.jump ||= !!pad.buttons[0]?.pressed;
    out.run ||= !!pad.buttons[2]?.pressed || !!pad.buttons[1]?.pressed;
    if (pad.buttons[9]?.pressed) beginOrRestart();
  }
  return out;
}

/** The single per-frame stepper: input -> sim -> sounds -> camera/light -> HUD. */
function Stepper({ onReady }: { onReady: () => void }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const frames = useRef(0);

  useFrame((state, delta) => {
    const g = getGame();
    const dt = Math.min(delta, 0.05);
    const pad = readGamepad();
    for (const k of ["left", "right", "jump", "run"] as const) {
      g.input[k] = g.keys[k] || g.touch[k] || pad[k];
    }
    const w = g.world;
    stepWorld(w, g.input, dt);
    for (const e of w.events) playSfx(e);
    w.events.length = 0;

    // Side-view camera follows the player horizontally.
    const p = w.player;
    const tx = THREE.MathUtils.clamp(p.x + p.facing * 1.5, CAM_HALF_WIDTH, w.level.width - CAM_HALF_WIDTH);
    const ty = 6.8 + Math.max(0, p.y - 7) * 0.6;
    const cam = state.camera;
    const k = 1 - Math.exp(-CAM_FOLLOW * dt);
    cam.position.x += (tx - cam.position.x) * (frames.current === 0 ? 1 : k);
    cam.position.y += (ty - cam.position.y) * (frames.current === 0 ? 1 : k);
    cam.position.z = 17;
    LOOK.set(cam.position.x, cam.position.y - 1.2, 0);
    cam.lookAt(LOOK);

    if (sun.current) {
      sun.current.position.set(cam.position.x - 8, 22, 14);
      sun.current.target.position.set(cam.position.x, 0, 0);
      sun.current.target.updateMatrixWorld();
    }

    const hud = useHud.getState();
    const time = Math.ceil(w.time);
    if (
      hud.score !== w.score ||
      hud.coins !== w.coinCount ||
      hud.lives !== w.lives ||
      hud.time !== time ||
      hud.status !== w.status
    ) {
      useHud.setState({ score: w.score, coins: w.coinCount, lives: w.lives, time, status: w.status });
    }

    frames.current++;
    if (frames.current === 3) onReady();
  }, -1);

  return (
    <directionalLight
      ref={sun}
      intensity={1.9}
      color="#fff4dc"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-24}
      shadow-camera-right={24}
      shadow-camera-top={16}
      shadow-camera-bottom={-6}
      shadow-camera-near={1}
      shadow-camera-far={60}
      shadow-bias={-0.0005}
    />
  );
}

function useKeyboard() {
  useEffect(() => {
    const map: Record<string, keyof Input> = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      Space: "jump",
      ArrowUp: "jump",
      KeyW: "jump",
      KeyZ: "jump",
      KeyK: "jump",
      ShiftLeft: "run",
      ShiftRight: "run",
      KeyX: "run",
      KeyJ: "run",
    };
    const down = (e: KeyboardEvent) => {
      unlockAudio();
      if (e.code === "Enter") beginOrRestart();
      const k = map[e.code];
      if (!k) return;
      e.preventDefault();
      const w = getGame().world;
      if (k === "jump" && (w.status === "title" || w.status === "gameover" || w.status === "won")) {
        beginOrRestart();
      }
      getGame().keys[k] = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = map[e.code];
      if (k) getGame().keys[k] = false;
    };
    const blur = () => {
      const keys = getGame().keys;
      keys.left = keys.right = keys.jump = keys.run = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
}

function useDebugHooks() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __game: unknown }).__game = {
      get world() {
        return getGame().world;
      },
      start: beginOrRestart,
      sim(seconds: number, input: Partial<Input> = {}) {
        const w = getGame().world;
        const inp: Input = { left: false, right: false, jump: false, run: false, ...input };
        for (let t = 0; t < seconds; t += 1 / 60) stepWorld(w, inp, 1 / 60);
        w.events.length = 0;
        return { x: w.player.x, y: w.player.y, status: w.status, score: w.score };
      },
    };
  }, []);
}

export default function Game() {
  const [ready, setReady] = useState(false);
  useKeyboard();
  useDebugHooks();

  return (
    <div className="game-root" data-scene-ready={ready ? "true" : undefined}>
      <Canvas
        shadows
        flat
        dpr={[1, 2]}
        camera={{ fov: 40, position: [CAM_HALF_WIDTH, 6.8, 17], near: 0.1, far: 200 }}
        onPointerDown={unlockAudio}
      >
        <color attach="background" args={["#8fd0ff"]} />
        <fog attach="fog" args={["#bfe6ff", 26, 70]} />
        <hemisphereLight args={["#dff1ff", "#6b4a2a", 0.95]} />
        <Stepper onReady={() => setReady(true)} />
        <Suspense fallback={null}>
          <Environment resolution={64}>
            <Lightformer intensity={1.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
            <Lightformer intensity={0.6} color="#bfe0ff" position={[-6, 2, 4]} rotation-y={Math.PI / 3} scale={[12, 3, 1]} />
          </Environment>
        </Suspense>
        <Tiles />
        <Pipes />
        <Decor />
        <Coins />
        <Mushrooms />
        <Enemies />
        <Player />
      </Canvas>
      <Hud />
    </div>
  );
}
