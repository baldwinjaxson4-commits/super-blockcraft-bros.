// Level layouts. Pure data, no React or three.js.

export const T = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  QCOIN: 3,
  QPOWER: 4, // gives a random power-up
  USED: 5,
  STONE: 6,
  PIPE: 7,
} as const;
export type TileId = (typeof T)[keyof typeof T];

export type Theme = "grass" | "desert" | "sky" | "nether";

export interface LevelData {
  name: string;
  title: string;
  theme: Theme;
  width: number;
  height: number;
  tiles: Uint8Array;
  start: { x: number; y: number };
  enemies: { x: number; y: number }[];
  coins: { x: number; y: number }[];
  pipes: { x: number; h: number; base: number }[];
  gaps: [number, number][];
  flagX: number;
  flagTop: number;
  castleX: number;
}

const HEIGHT = 16;

class Builder {
  width: number;
  tiles: Uint8Array;
  enemies: { x: number; y: number }[] = [];
  coins: { x: number; y: number }[] = [];
  pipes: { x: number; h: number; base: number }[] = [];
  constructor(public flagX: number) {
    this.width = flagX + 14;
    this.tiles = new Uint8Array(this.width * HEIGHT);
  }
  set(x: number, y: number, t: number) {
    if (x >= 0 && x < this.width && y >= 0 && y < HEIGHT) this.tiles[y * this.width + x] = t;
  }
  /** Two-row ground from x0 (inclusive) to x1 (exclusive), skipping gaps. */
  ground(x0: number, x1: number, gaps: [number, number][] = []) {
    for (let x = x0; x < Math.min(x1, this.width); x++) {
      if (gaps.some(([a, b]) => x >= a && x < b)) continue;
      this.set(x, 0, T.GROUND);
      this.set(x, 1, T.GROUND);
    }
  }
  /** One-block-thick floating grass platform at row y, x0..x1 inclusive. */
  platform(x0: number, x1: number, y: number) {
    for (let x = x0; x <= x1; x++) this.set(x, y, T.GROUND);
  }
  /** Stone column rising from the bottom of the world; its top is at y = h. */
  pillar(x: number, h: number) {
    for (let y = 0; y < h; y++) this.set(x, y, T.STONE);
  }
  row(x0: number, x1: number, y: number, t: number) {
    for (let x = x0; x <= x1; x++) this.set(x, y, t);
  }
  pipe(x: number, h: number, base = 2) {
    this.pipes.push({ x, h, base });
    for (let y = base; y < base + h; y++) {
      this.set(x, y, T.PIPE);
      this.set(x + 1, y, T.PIPE);
    }
  }
  stairs(x: number, n: number, dir: 1 | -1, extra = 0) {
    for (let i = 0; i < n + extra; i++) {
      const h = dir === 1 ? Math.min(n, i + 1) : n - i;
      for (let y = 2; y < 2 + h; y++) this.set(x + i, y, T.STONE);
    }
  }
  coinRow(x0: number, x1: number, y: number) {
    for (let x = x0; x <= x1; x++) this.coins.push({ x: x + 0.5, y: y + 0.5 });
  }
  enemy(x: number, y = 2) {
    this.enemies.push({ x, y });
  }
  finish(name: string, title: string, theme: Theme): LevelData {
    this.set(this.flagX, 2, T.STONE);
    const gaps: [number, number][] = [];
    let start = -1;
    for (let x = 0; x <= this.width; x++) {
      const empty = x < this.width && this.tiles[this.width + x] === T.EMPTY;
      if (empty && start < 0) start = x;
      if (!empty && start >= 0) {
        gaps.push([start, x]);
        start = -1;
      }
    }
    return {
      name,
      title,
      theme,
      width: this.width,
      height: HEIGHT,
      tiles: this.tiles,
      start: { x: 3.5, y: 2 },
      enemies: this.enemies,
      coins: this.coins,
      pipes: this.pipes,
      gaps,
      flagX: this.flagX,
      flagTop: 11.5,
      castleX: this.flagX + 6.5,
    };
  }
}

function grassland(): LevelData {
  const b = new Builder(198);
  b.ground(0, b.width, [
    [69, 71],
    [86, 89],
    [153, 155],
  ]);
  b.set(16, 5, T.QCOIN);
  b.set(20, 5, T.BRICK);
  b.set(21, 5, T.QPOWER);
  b.set(22, 5, T.BRICK);
  b.set(23, 5, T.QCOIN);
  b.set(24, 5, T.BRICK);
  b.set(22, 9, T.QCOIN);
  b.pipe(28, 2);
  b.pipe(38, 3);
  b.pipe(46, 4);
  b.pipe(57, 4);
  b.set(77, 5, T.BRICK);
  b.set(78, 5, T.QPOWER);
  b.set(79, 5, T.BRICK);
  b.row(80, 87, 9, T.BRICK);
  b.row(91, 93, 9, T.BRICK);
  b.set(94, 9, T.QCOIN);
  b.set(94, 5, T.BRICK);
  b.set(100, 5, T.BRICK);
  b.set(101, 5, T.QCOIN);
  b.set(106, 5, T.QCOIN);
  b.set(109, 5, T.QCOIN);
  b.set(109, 9, T.QPOWER);
  b.set(112, 5, T.QCOIN);
  b.set(118, 5, T.BRICK);
  b.row(121, 123, 9, T.BRICK);
  b.set(128, 9, T.BRICK);
  b.set(129, 9, T.QCOIN);
  b.set(130, 9, T.QCOIN);
  b.set(131, 9, T.BRICK);
  b.set(129, 5, T.BRICK);
  b.set(130, 5, T.BRICK);
  b.stairs(134, 4, 1);
  b.stairs(140, 4, -1);
  b.stairs(148, 4, 1, 1);
  b.stairs(155, 4, -1);
  b.pipe(163, 2);
  b.set(168, 5, T.BRICK);
  b.set(169, 5, T.BRICK);
  b.set(170, 5, T.QCOIN);
  b.set(171, 5, T.BRICK);
  b.pipe(179, 2);
  b.stairs(181, 8, 1, 1);

  b.coinRow(12, 14, 4);
  b.coinRow(33, 34, 4);
  b.coinRow(62, 65, 5);
  b.coinRow(86, 88, 6);
  b.coinRow(102, 104, 4);
  b.coinRow(144, 146, 4);
  b.coinRow(172, 175, 4);
  b.coinRow(192, 194, 4);

  for (const x of [22, 41, 51, 53, 97, 99, 114, 115.5, 124, 125.5, 128, 129.5, 174, 175.5]) b.enemy(x);
  b.enemy(81, 10);
  b.enemy(83, 10);
  return b.finish("1-1", "GRASSLAND", "grass");
}

function desert(): LevelData {
  const b = new Builder(182);
  b.ground(0, b.width, [
    [40, 43],
    [95, 99],
    [132, 135],
  ]);
  b.set(14, 5, T.QCOIN);
  b.set(17, 5, T.BRICK);
  b.set(18, 5, T.QPOWER);
  b.set(19, 5, T.BRICK);
  b.set(18, 9, T.QCOIN);
  b.pipe(26, 3);
  b.pipe(34, 2);
  b.coinRow(40, 42, 6);
  b.row(47, 54, 5, T.BRICK);
  b.set(50, 5, T.QCOIN);
  b.set(52, 5, T.QPOWER);
  b.row(49, 53, 9, T.BRICK);
  b.set(51, 9, T.QCOIN);
  b.coinRow(49, 53, 10);
  b.stairs(60, 3, 1);
  b.stairs(66, 3, -1);
  b.coinRow(63, 65, 6);
  b.pipe(74, 4);
  b.pipe(84, 3);
  b.coinRow(95, 98, 6);
  b.row(103, 105, 5, T.QCOIN);
  b.set(104, 9, T.QPOWER);
  b.stairs(116, 4, 1, 1);
  b.stairs(121, 4, -1);
  b.set(128, 5, T.BRICK);
  b.set(129, 5, T.QCOIN);
  b.set(130, 5, T.BRICK);
  b.pipe(140, 2);
  b.pipe(152, 3);
  b.coinRow(157, 160, 4);
  b.stairs(165, 8, 1, 1);
  for (const x of [24, 31, 37, 50, 52, 55, 78, 80, 108, 110, 112, 126, 145, 147, 158, 162]) b.enemy(x);
  return b.finish("1-2", "DESERT DUNES", "desert");
}

function skyIslands(): LevelData {
  const b = new Builder(172);
  b.ground(0, 17);
  b.coinRow(8, 10, 4);
  b.set(12, 5, T.QCOIN);
  b.platform(20, 25, 4);
  b.coinRow(21, 24, 6);
  b.platform(29, 33, 6);
  b.enemy(31, 7);
  b.platform(37, 42, 4);
  b.set(39, 8, T.BRICK);
  b.set(40, 8, T.QPOWER);
  b.set(41, 8, T.BRICK);
  b.platform(46, 49, 7);
  b.platform(53, 62, 3);
  b.enemy(56, 4);
  b.enemy(59, 4);
  b.set(57, 7, T.QCOIN);
  b.set(58, 7, T.QCOIN);
  b.platform(66, 70, 5);
  b.coinRow(66, 70, 7);
  b.platform(74, 78, 8);
  b.enemy(76, 9);
  b.platform(82, 93, 4);
  b.row(85, 90, 8, T.BRICK);
  b.set(87, 8, T.QPOWER);
  b.set(88, 8, T.QCOIN);
  b.enemy(86, 5);
  b.enemy(89, 5);
  b.enemy(91, 5);
  b.platform(97, 100, 6);
  b.platform(104, 107, 8);
  b.coinRow(104, 107, 10);
  b.platform(111, 124, 3);
  b.pipe(116, 2, 4);
  b.enemy(113, 4);
  b.enemy(120, 4);
  b.enemy(122, 4);
  b.platform(128, 131, 5);
  b.platform(135, 138, 7);
  b.set(136, 11, T.QCOIN);
  b.set(137, 11, T.QPOWER);
  b.platform(142, 145, 5);
  b.platform(149, 152, 3);
  b.ground(156, b.width);
  b.stairs(162, 6, 1, 1);
  b.coinRow(157, 160, 4);
  b.enemy(159);
  return b.finish("1-3", "SKY ISLANDS", "sky");
}

function lavaCastle(): LevelData {
  const b = new Builder(156);
  b.ground(0, b.width, [
    [20, 23],
    [38, 44],
    [60, 64],
    [82, 88],
    [110, 113],
    [130, 134],
  ]);
  b.pillar(40, 4);
  b.pillar(41, 4);
  b.pillar(62, 3);
  b.pillar(84, 3);
  b.pillar(85, 5);
  b.set(12, 5, T.QCOIN);
  b.set(14, 5, T.QPOWER);
  b.row(26, 30, 5, T.BRICK);
  b.set(28, 5, T.QCOIN);
  b.set(28, 9, T.QPOWER);
  b.stairs(48, 3, 1);
  b.stairs(51, 3, -1);
  b.pipe(68, 3);
  b.pipe(76, 2);
  b.row(92, 99, 6, T.BRICK);
  b.set(95, 6, T.QCOIN);
  b.set(96, 6, T.QPOWER);
  b.coinRow(92, 99, 8);
  b.stairs(102, 4, 1, 1);
  b.row(117, 121, 5, T.BRICK);
  b.set(119, 5, T.QCOIN);
  b.pipe(124, 4);
  b.coinRow(130, 133, 6);
  b.stairs(140, 8, 1, 1);
  for (const x of [16, 18, 25, 33, 35, 46, 55, 57, 72, 80, 91, 93, 116, 118, 120, 127, 136, 138]) b.enemy(x);
  b.enemy(94, 7);
  return b.finish("1-4", "LAVA CASTLE", "nether");
}

export const LEVELS: (() => LevelData)[] = [grassland, desert, skyIslands, lavaCastle];

export function buildLevel(index = 0): LevelData {
  const make = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index))]!;
  return make();
}
