// Level layout for World 1-1. Pure data, no React or three.js.

export const T = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  QCOIN: 3,
  QMUSH: 4,
  USED: 5,
  STONE: 6,
  PIPE: 7,
} as const;
export type TileId = (typeof T)[keyof typeof T];

export interface LevelData {
  width: number;
  height: number;
  tiles: Uint8Array;
  start: { x: number; y: number };
  enemies: { x: number; y: number }[];
  coins: { x: number; y: number }[];
  pipes: { x: number; h: number }[];
  gaps: [number, number][];
  flagX: number;
  flagTop: number;
  castleX: number;
}

export function buildLevel(): LevelData {
  const width = 212;
  const height = 16;
  const tiles = new Uint8Array(width * height);
  const set = (x: number, y: number, t: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) tiles[y * width + x] = t;
  };

  const gaps: [number, number][] = [
    [69, 71],
    [86, 89],
    [153, 155],
  ];
  for (let x = 0; x < width; x++) {
    if (gaps.some(([a, b]) => x >= a && x < b)) continue;
    set(x, 0, T.GROUND);
    set(x, 1, T.GROUND);
  }

  const pipes: { x: number; h: number }[] = [];
  const pipe = (x: number, h: number) => {
    pipes.push({ x, h });
    for (let y = 2; y < 2 + h; y++) {
      set(x, y, T.PIPE);
      set(x + 1, y, T.PIPE);
    }
  };
  const stairs = (x: number, n: number, dir: 1 | -1, extra = 0) => {
    for (let i = 0; i < n + extra; i++) {
      const h = dir === 1 ? Math.min(n, i + 1) : n - i;
      for (let y = 2; y < 2 + h; y++) set(x + i, y, T.STONE);
    }
  };

  set(16, 5, T.QCOIN);
  set(20, 5, T.BRICK);
  set(21, 5, T.QMUSH);
  set(22, 5, T.BRICK);
  set(23, 5, T.QCOIN);
  set(24, 5, T.BRICK);
  set(22, 9, T.QCOIN);

  pipe(28, 2);
  pipe(38, 3);
  pipe(46, 4);
  pipe(57, 4);

  set(77, 5, T.BRICK);
  set(78, 5, T.QMUSH);
  set(79, 5, T.BRICK);
  for (let x = 80; x <= 87; x++) set(x, 9, T.BRICK);
  for (let x = 91; x <= 93; x++) set(x, 9, T.BRICK);
  set(94, 9, T.QCOIN);
  set(94, 5, T.BRICK);

  set(100, 5, T.BRICK);
  set(101, 5, T.QCOIN);
  set(106, 5, T.QCOIN);
  set(109, 5, T.QCOIN);
  set(109, 9, T.QMUSH);
  set(112, 5, T.QCOIN);

  set(118, 5, T.BRICK);
  for (let x = 121; x <= 123; x++) set(x, 9, T.BRICK);
  set(128, 9, T.BRICK);
  set(129, 9, T.QCOIN);
  set(130, 9, T.QCOIN);
  set(131, 9, T.BRICK);
  set(129, 5, T.BRICK);
  set(130, 5, T.BRICK);

  stairs(134, 4, 1);
  stairs(140, 4, -1);
  stairs(148, 4, 1, 1);
  stairs(155, 4, -1);

  pipe(163, 2);
  set(168, 5, T.BRICK);
  set(169, 5, T.BRICK);
  set(170, 5, T.QCOIN);
  set(171, 5, T.BRICK);
  pipe(179, 2);

  stairs(181, 8, 1, 1);

  const flagX = 198;
  set(flagX, 2, T.STONE);

  const coins: { x: number; y: number }[] = [];
  const coinRow = (x0: number, x1: number, y: number) => {
    for (let x = x0; x <= x1; x++) coins.push({ x: x + 0.5, y: y + 0.5 });
  };
  coinRow(12, 14, 4);
  coinRow(33, 34, 4);
  coinRow(62, 65, 5);
  coinRow(86, 88, 6);
  coinRow(102, 104, 4);
  coinRow(144, 146, 4);
  coinRow(172, 175, 4);
  coinRow(192, 194, 4);

  const enemies = [
    { x: 22, y: 2 },
    { x: 41, y: 2 },
    { x: 51, y: 2 },
    { x: 53, y: 2 },
    { x: 81, y: 10 },
    { x: 83, y: 10 },
    { x: 97, y: 2 },
    { x: 99, y: 2 },
    { x: 114, y: 2 },
    { x: 115.5, y: 2 },
    { x: 124, y: 2 },
    { x: 125.5, y: 2 },
    { x: 128, y: 2 },
    { x: 129.5, y: 2 },
    { x: 174, y: 2 },
    { x: 175.5, y: 2 },
  ];

  return {
    width,
    height,
    tiles,
    start: { x: 3.5, y: 2 },
    enemies,
    coins,
    pipes,
    gaps,
    flagX,
    flagTop: 11.5,
    castleX: 204.5,
  };
}
