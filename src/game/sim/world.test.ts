import { describe, expect, it } from "vitest";
import { createWorld, flagBonus, startGame, stepWorld, type Input } from "./world";
import { T } from "./level";

const idle: Input = { left: false, right: false, jump: false, run: false };

function sim(w: ReturnType<typeof createWorld>, input: Input, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) stepWorld(w, input, 1 / 60);
}

describe("platformer sim", () => {
  it("player stands on the ground at the start", () => {
    const w = createWorld();
    startGame(w);
    sim(w, idle, 1);
    expect(w.player.y).toBeCloseTo(2, 3);
    expect(w.player.onGround).toBe(true);
  });

  it("a full jump clears 4 blocks (tallest pipe)", () => {
    const w = createWorld();
    startGame(w);
    sim(w, idle, 0.2);
    let peak = 0;
    for (let t = 0; t < 1.2; t += 1 / 60) {
      stepWorld(w, { ...idle, jump: true }, 1 / 60);
      peak = Math.max(peak, w.player.y);
    }
    expect(peak - 2).toBeGreaterThan(4);
  });

  it("bumping a ? block from below gives a coin and empties it", () => {
    const w = createWorld();
    startGame(w);
    w.player.x = 16.5;
    sim(w, idle, 0.1);
    sim(w, { ...idle, jump: true }, 0.6);
    expect(w.tiles[5 * w.level.width + 16]).toBe(T.USED);
    expect(w.coinCount).toBe(1);
  });

  it("stomping an enemy squashes it and bounces the player", () => {
    const w = createWorld();
    startGame(w);
    const e = w.enemies[0]!;
    e.state = "walk";
    e.vx = 0;
    w.player.x = e.x;
    w.player.y = e.y + 0.8;
    w.player.vy = -5;
    stepWorld(w, idle, 1 / 30);
    expect(e.state).toBe("squashed");
    expect(w.player.vy).toBeGreaterThan(0);
  });

  it("touching an enemy from the side while small loses a life", () => {
    const w = createWorld();
    startGame(w);
    const e = w.enemies[0]!;
    e.state = "walk";
    w.player.x = e.x - 0.5;
    stepWorld(w, idle, 1 / 60);
    expect(w.status).toBe("dying");
    sim(w, idle, 3.2);
    expect(w.lives).toBe(2);
    expect(w.status).toBe("playing");
  });

  it("reaching the flagpole clears the course", () => {
    const w = createWorld();
    startGame(w);
    w.enemies.forEach((e) => (e.state = "dead"));
    w.player.x = 192;
    sim(w, { ...idle, right: true }, 2);
    expect(w.status).toBe("flag");
    sim(w, idle, 6);
    expect(w.status).toBe("won");
  });

  it("flag bonus is highest at the top of the pole", () => {
    expect(flagBonus(8.5)).toBe(5000);
    expect(flagBonus(0.5)).toBe(100);
  });
});
