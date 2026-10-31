// Game simulation: player, enemies, items, blocks and rules. Pure TypeScript.
import * as C from "./constants";
import { buildLevel, T, type LevelData } from "./level";

export type Status = "title" | "playing" | "dying" | "flag" | "won" | "gameover";
export type GameEvent =
  | "jump"
  | "coin"
  | "stomp"
  | "bump"
  | "break"
  | "powerup"
  | "sprout"
  | "shrink"
  | "die"
  | "flag"
  | "win"
  | "oneup"
  | "kick";

export interface Body {
  x: number; // center
  y: number; // bottom
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

export interface Player extends Body {
  big: boolean;
  facing: 1 | -1;
  coyote: number;
  jumpBuffer: number;
  jumpHeldPrev: boolean;
  jumping: boolean;
  invuln: number;
  visible: boolean;
}

export interface Enemy extends Body {
  state: "sleep" | "walk" | "squashed" | "flipped" | "dead";
  timer: number;
}

export interface Mushroom extends Body {
  state: "emerging" | "moving" | "gone";
  startY: number;
}

export interface Coin {
  x: number;
  y: number;
  taken: boolean;
}

export interface Effect {
  kind: "coin" | "debris";
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
}

export interface Bump {
  tx: number;
  ty: number;
  t: number;
}

export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
}

export interface World {
  level: LevelData;
  tiles: Uint8Array;
  tilesVersion: number;
  player: Player;
  enemies: Enemy[];
  mushrooms: Mushroom[];
  coins: Coin[];
  effects: Effect[];
  bumps: Bump[];
  status: Status;
  flagPhase: "slide" | "walk";
  score: number;
  coinCount: number;
  lives: number;
  time: number;
  deathTimer: number;
  flagY: number;
  elapsed: number;
  levelId: number;
  events: GameEvent[];
}

export const BUMP_TIME = 0.2;

function makePlayer(level: LevelData): Player {
  return {
    x: level.start.x,
    y: level.start.y,
    w: C.PLAYER_W,
    h: C.SMALL_H,
    vx: 0,
    vy: 0,
    onGround: true,
    big: false,
    facing: 1,
    coyote: 0,
    jumpBuffer: 0,
    jumpHeldPrev: true,
    jumping: false,
    invuln: 0,
    visible: true,
  };
}

export function resetLevel(w: World) {
  const level = buildLevel();
  w.level = level;
  w.tiles = level.tiles;
  w.tilesVersion++;
  w.player = makePlayer(level);
  w.enemies = level.enemies.map((e) => ({
    x: e.x,
    y: e.y,
    w: C.ENEMY_W,
    h: C.ENEMY_H,
    vx: 0,
    vy: 0,
    onGround: true,
    state: "sleep",
    timer: 0,
  }));
  w.mushrooms = [];
  w.coins = level.coins.map((c) => ({ ...c, taken: false }));
  w.effects = [];
  w.bumps = [];
  w.time = C.LEVEL_TIME;
  w.deathTimer = 0;
  w.flagY = level.flagTop;
  w.flagPhase = "slide";
  w.levelId++;
}

export function createWorld(): World {
  const w = {
    tilesVersion: 0,
    status: "title",
    score: 0,
    coinCount: 0,
    lives: C.START_LIVES,
    elapsed: 0,
    levelId: 0,
    events: [],
  } as unknown as World;
  resetLevel(w);
  return w;
}

export function startGame(w: World) {
  if (w.status === "title") {
    w.status = "playing";
    w.player.jumpHeldPrev = true;
  }
}

/** Reset score and lives and start playing again (after game over or a win). */
export function restartGame(w: World) {
  w.score = 0;
  w.coinCount = 0;
  w.lives = C.START_LIVES;
  resetLevel(w);
  w.status = "playing";
}

// ---------- tiles & collision ----------

export function tileAt(w: World, tx: number, ty: number): number {
  const { width, height } = w.level;
  if (tx < 0 || tx >= width || ty < 0 || ty >= height) return T.EMPTY;
  return w.tiles[ty * width + tx] ?? T.EMPTY;
}

export function isSolid(w: World, tx: number, ty: number): boolean {
  if (tx < 0 || tx >= w.level.width) return true;
  if (ty < 0 || ty >= w.level.height) return false;
  return w.tiles[ty * w.level.width + tx] !== T.EMPTY;
}

function setTile(w: World, tx: number, ty: number, t: number) {
  w.tiles[ty * w.level.width + tx] = t;
  w.tilesVersion++;
}

const EPS = 1e-4;

/** Move horizontally; returns true when blocked by a wall. */
export function moveX(w: World, b: Body, dx: number): boolean {
  if (dx === 0) return false;
  b.x += dx;
  const y0 = Math.floor(b.y + EPS);
  const y1 = Math.floor(b.y + b.h - EPS);
  if (dx > 0) {
    const tx = Math.floor(b.x + b.w / 2);
    for (let ty = y0; ty <= y1; ty++) {
      if (isSolid(w, tx, ty)) {
        b.x = tx - b.w / 2 - EPS;
        return true;
      }
    }
  } else {
    const tx = Math.floor(b.x - b.w / 2);
    for (let ty = y0; ty <= y1; ty++) {
      if (isSolid(w, tx, ty)) {
        b.x = tx + 1 + b.w / 2 + EPS;
        return true;
      }
    }
  }
  return false;
}

export interface YHit {
  ground: boolean;
  ceil: boolean;
  ceilTy: number;
  ceilTiles: number[];
}

/** Move vertically; reports ground/ceiling contacts. */
export function moveY(w: World, b: Body, dy: number): YHit {
  const hit: YHit = { ground: false, ceil: false, ceilTy: 0, ceilTiles: [] };
  b.y += dy;
  const x0 = Math.floor(b.x - b.w / 2 + EPS);
  const x1 = Math.floor(b.x + b.w / 2 - EPS);
  if (dy < 0) {
    const ty = Math.floor(b.y);
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(w, tx, ty)) {
        b.y = ty + 1;
        hit.ground = true;
        break;
      }
    }
  } else if (dy > 0) {
    const ty = Math.floor(b.y + b.h);
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(w, tx, ty)) {
        hit.ceil = true;
        hit.ceilTy = ty;
        hit.ceilTiles.push(tx);
      }
    }
    if (hit.ceil) b.y = ty - b.h - EPS;
  }
  return hit;
}

function overlap(a: Body, b: { x: number; y: number; w: number; h: number }) {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

// ---------- rules ----------

function addScore(w: World, n: number) {
  w.score += n;
}

function addCoin(w: World) {
  w.coinCount++;
  addScore(w, 200);
  w.events.push("coin");
  if (w.coinCount >= 100) {
    w.coinCount -= 100;
    w.lives++;
    w.events.push("oneup");
  }
}

function hitBlock(w: World, tx: number, ty: number) {
  const t = tileAt(w, tx, ty);
  const p = w.player;
  if (t === T.QCOIN) {
    setTile(w, tx, ty, T.USED);
    w.bumps.push({ tx, ty, t: 0 });
    w.effects.push({ kind: "coin", x: tx + 0.5, y: ty + 1, vx: 0, vy: 12, t: 0, life: 0.55 });
    addCoin(w);
  } else if (t === T.QPOWER) {
    setTile(w, tx, ty, T.USED);
    w.bumps.push({ tx, ty, t: 0 });
    w.mushrooms.push({
      x: tx + 0.5,
      y: ty + 0.2,
      w: 0.8,
      h: 0.8,
      vx: 0,
      vy: 0,
      onGround: false,
      state: "emerging",
      startY: ty + 0.2,
    });
    w.events.push("sprout");
  } else if (t === T.BRICK) {
    if (p.big) {
      setTile(w, tx, ty, T.EMPTY);
      for (const [vx, vy] of [
        [-3, 10],
        [3, 10],
        [-2.2, 7],
        [2.2, 7],
      ] as const) {
        w.effects.push({ kind: "debris", x: tx + 0.5, y: ty + 0.5, vx, vy, t: 0, life: 1.4 });
      }
      addScore(w, 50);
      w.events.push("break");
    } else {
      w.bumps.push({ tx, ty, t: 0 });
      w.events.push("bump");
    }
  } else {
    w.events.push("bump");
  }
  // Knock out enemies standing on the bumped block.
  for (const e of w.enemies) {
    if (e.state !== "walk") continue;
    if (Math.abs(e.y - (ty + 1)) < 0.2 && Math.abs(e.x - (tx + 0.5)) < 0.9) {
      e.state = "flipped";
      e.vy = 8;
      e.vx = e.x >= tx + 0.5 ? 2 : -2;
      addScore(w, 100);
      w.events.push("kick");
    }
  }
}

function killPlayer(w: World) {
  if (w.status !== "playing") return;
  const p = w.player;
  w.status = "dying";
  w.deathTimer = 0;
  p.vx = 0;
  p.vy = 14;
  p.big = false;
  p.h = C.SMALL_H;
  w.events.push("die");
}

function hurtPlayer(w: World) {
  const p = w.player;
  if (p.invuln > 0) return;
  if (p.big) {
    p.big = false;
    p.h = C.SMALL_H;
    p.invuln = C.INVULN_TIME;
    w.events.push("shrink");
  } else {
    killPlayer(w);
  }
}

function stepPlayer(w: World, input: Input, dt: number) {
  const p = w.player;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const max = input.run ? C.RUN_SPEED : C.WALK_SPEED;

  if (dir !== 0) {
    let accel = p.onGround ? C.GROUND_ACCEL : C.AIR_ACCEL;
    if (p.onGround && p.vx !== 0 && Math.sign(p.vx) !== dir) accel = C.SKID_ACCEL;
    p.vx += dir * accel * dt;
    if (Math.abs(p.vx) > max) {
      // Ease back down to max when releasing run instead of snapping.
      const over = Math.abs(p.vx) - max;
      p.vx = Math.sign(p.vx) * (max + over * Math.exp(-6 * dt));
    }
    p.facing = dir as 1 | -1;
  } else {
    p.vx *= Math.exp(-(p.onGround ? C.GROUND_DRAG : C.AIR_DRAG) * dt);
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
  }

  const pressed = input.jump && !p.jumpHeldPrev;
  p.jumpHeldPrev = input.jump;
  p.jumpBuffer = pressed ? C.JUMP_BUFFER : p.jumpBuffer - dt;
  p.coyote = p.onGround ? C.COYOTE_TIME : p.coyote - dt;
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = C.JUMP_VELOCITY + Math.abs(p.vx) * C.JUMP_RUN_BONUS;
    p.jumping = true;
    p.onGround = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    w.events.push("jump");
  }

  const g =
    p.vy > 0 ? (input.jump && p.jumping ? C.GRAVITY_UP : C.GRAVITY_CUT) : C.GRAVITY_DOWN;
  p.vy = Math.max(p.vy - g * dt, -C.MAX_FALL);

  if (moveX(w, p, p.vx * dt)) p.vx = 0;
  const hit = moveY(w, p, p.vy * dt);
  p.onGround = hit.ground;
  if (hit.ground) {
    p.vy = 0;
    p.jumping = false;
  }
  if (hit.ceil) {
    p.vy = -1;
    // Bump the block closest to the player's head center.
    let best = hit.ceilTiles[0]!;
    for (const tx of hit.ceilTiles) {
      if (Math.abs(tx + 0.5 - p.x) < Math.abs(best + 0.5 - p.x)) best = tx;
    }
    hitBlock(w, best, hit.ceilTy);
  }

  if (p.invuln > 0) p.invuln -= dt;
  if (p.y < C.PIT_Y) killPlayer(w);
}

function stepEnemies(w: World, dt: number) {
  const p = w.player;
  for (const e of w.enemies) {
    if (e.state === "sleep") {
      if (e.x < p.x + C.ENEMY_WAKE_DISTANCE) {
        e.state = "walk";
        e.vx = -C.ENEMY_SPEED;
      }
      continue;
    }
    if (e.state === "walk") {
      e.vy = Math.max(e.vy - C.GRAVITY_DOWN * dt, -C.MAX_FALL);
      if (moveX(w, e, e.vx * dt)) e.vx = -e.vx;
      const hit = moveY(w, e, e.vy * dt);
      e.onGround = hit.ground;
      if (hit.ground) e.vy = 0;
      if (e.y < C.PIT_Y) e.state = "dead";
    } else if (e.state === "squashed") {
      e.timer -= dt;
      if (e.timer <= 0) e.state = "dead";
    } else if (e.state === "flipped") {
      e.vy -= C.GRAVITY_DOWN * 0.6 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.y < -6) e.state = "dead";
    }
  }
  // Walking enemies turn around when they bump into each other.
  const n = w.enemies.length;
  for (let i = 0; i < n; i++) {
    const a = w.enemies[i]!;
    if (a.state !== "walk") continue;
    for (let j = i + 1; j < n; j++) {
      const b = w.enemies[j]!;
      if (b.state !== "walk" || !overlap(a, b)) continue;
      const left = a.x < b.x ? a : b;
      const right = left === a ? b : a;
      left.vx = -Math.abs(left.vx || C.ENEMY_SPEED);
      right.vx = Math.abs(right.vx || C.ENEMY_SPEED);
    }
  }
}

function playerVsEnemies(w: World, input: Input) {
  const p = w.player;
  for (const e of w.enemies) {
    if (e.state !== "walk" || !overlap(p, e)) continue;
    const stomp = p.vy < 0 && p.y > e.y + e.h * 0.35;
    if (stomp) {
      e.state = "squashed";
      e.timer = 0.5;
      p.vy = input.jump ? C.STOMP_BOUNCE_HELD : C.STOMP_BOUNCE;
      p.jumping = true;
      addScore(w, 100);
      w.events.push("stomp");
    } else {
      hurtPlayer(w);
      if (w.status !== "playing") return;
    }
  }
}

function stepMushrooms(w: World, dt: number) {
  const p = w.player;
  for (const m of w.mushrooms) {
    if (m.state === "gone") continue;
    if (m.state === "emerging") {
      m.y += dt * 1.6;
      if (m.y >= m.startY + 0.8) {
        m.y = m.startY + 0.8;
        m.state = "moving";
        m.vx = C.MUSHROOM_SPEED;
      }
    } else {
      m.vy = Math.max(m.vy - C.GRAVITY_DOWN * dt, -C.MAX_FALL);
      if (moveX(w, m, m.vx * dt)) m.vx = -m.vx;
      const hit = moveY(w, m, m.vy * dt);
      if (hit.ground) m.vy = 0;
      if (m.y < C.PIT_Y) m.state = "gone";
    }
    if (m.state !== "gone" && overlap(p, m)) {
      m.state = "gone";
      addScore(w, 1000);
      if (!p.big) {
        p.big = true;
        p.h = C.BIG_H;
      }
      w.events.push("powerup");
    }
  }
}

function collectCoins(w: World) {
  const p = w.player;
  for (const c of w.coins) {
    if (c.taken) continue;
    if (overlap(p, { x: c.x, y: c.y - 0.35, w: 0.5, h: 0.7 })) {
      c.taken = true;
      addCoin(w);
    }
  }
}

export function flagBonus(heightAboveBase: number): number {
  if (heightAboveBase >= 8) return 5000;
  if (heightAboveBase >= 6) return 2000;
  if (heightAboveBase >= 4) return 800;
  if (heightAboveBase >= 2) return 400;
  return 100;
}

function checkFlag(w: World) {
  const p = w.player;
  const poleX = w.level.flagX + 0.5;
  // Touching the pole's base block counts as grabbing the pole.
  if (p.x + p.w / 2 < w.level.flagX - 0.02) return;
  w.status = "flag";
  w.flagPhase = "slide";
  p.x = poleX - p.w / 2 - 0.08;
  p.vx = 0;
  p.vy = 0;
  p.facing = 1;
  addScore(w, flagBonus(p.y - 3));
  w.events.push("flag");
}

function stepFlag(w: World, dt: number) {
  const p = w.player;
  if (w.flagPhase === "slide") {
    p.y = Math.max(3, p.y - 9 * dt);
    w.flagY = Math.max(3.6, w.flagY - 9 * dt);
    if (p.y <= 3 && w.flagY <= 3.6) w.flagPhase = "walk";
    return;
  }
  p.vx = 4;
  p.vy = Math.max(p.vy - C.GRAVITY_DOWN * dt, -C.MAX_FALL);
  moveX(w, p, p.vx * dt);
  const hit = moveY(w, p, p.vy * dt);
  p.onGround = hit.ground;
  if (hit.ground) p.vy = 0;
  if (p.x >= w.level.castleX) {
    p.visible = false;
    p.vx = 0;
    addScore(w, Math.ceil(w.time) * 50);
    w.time = 0;
    w.status = "won";
    w.events.push("win");
  }
}

function stepDying(w: World, dt: number) {
  const p = w.player;
  w.deathTimer += dt;
  if (w.deathTimer > 0.45) {
    p.vy -= C.GRAVITY_DOWN * 0.55 * dt;
    p.y += p.vy * dt;
  }
  if (w.deathTimer >= C.DEATH_TIME) {
    if (w.lives > 1) {
      w.lives--;
      resetLevel(w);
      w.status = "playing";
    } else {
      w.lives = 0;
      w.status = "gameover";
    }
  }
}

function stepEffects(w: World, dt: number) {
  for (const b of w.bumps) b.t += dt;
  w.bumps = w.bumps.filter((b) => b.t < BUMP_TIME);
  for (const e of w.effects) {
    e.t += dt;
    e.vy -= (e.kind === "coin" ? 40 : C.GRAVITY_DOWN * 0.7) * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
  w.effects = w.effects.filter((e) => e.t < e.life);
}

function substep(w: World, input: Input, dt: number) {
  w.elapsed += dt;
  switch (w.status) {
    case "playing":
      w.time -= dt * C.TIME_SCALE;
      stepPlayer(w, input, dt);
      if (w.status !== "playing") break;
      stepEnemies(w, dt);
      playerVsEnemies(w, input);
      if (w.status !== "playing") break;
      stepMushrooms(w, dt);
      collectCoins(w);
      checkFlag(w);
      if (w.time <= 0 && w.status === "playing") {
        w.time = 0;
        killPlayer(w);
      }
      break;
    case "dying":
      stepDying(w, dt);
      break;
    case "flag":
      stepFlag(w, dt);
      break;
    default:
      break;
  }
  stepEffects(w, dt);
}

/** Advance the world by dt seconds, in small fixed substeps. */
export function stepWorld(w: World, input: Input, dt: number) {
  const steps = Math.max(1, Math.ceil(dt / C.MAX_SUBSTEP));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) substep(w, input, h);
}
