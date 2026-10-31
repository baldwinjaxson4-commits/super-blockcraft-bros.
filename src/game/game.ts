// Shared game instance (world + merged input) and the HUD store.
import { create } from "zustand";
import { createWorld, type Input, type Status, type World } from "./sim/world";

export interface Game {
  world: World;
  input: Input;
  keys: Input;
  touch: Input;
}

let game: Game | null = null;

export function getGame(): Game {
  if (!game) {
    const blank = (): Input => ({ left: false, right: false, jump: false, run: false });
    game = { world: createWorld(), input: blank(), keys: blank(), touch: blank() };
  }
  return game;
}

export interface HudState {
  score: number;
  coins: number;
  lives: number;
  time: number;
  status: Status;
  muted: boolean;
}

export const useHud = create<HudState>(() => ({
  score: 0,
  coins: 0,
  lives: 3,
  time: 300,
  status: "title",
  muted: false,
}));
