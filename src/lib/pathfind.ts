// src/lib/pathfind.ts
export type TileType = 'end' | 'straight' | 'corner' | 'tee' | 'cross' | 'block';
export type Dir = 'N' | 'E' | 'S' | 'W';
export interface Tile { type: TileType; rot: 0 | 1 | 2 | 3; }
export type Grid = Tile[][];

const dirVec: Record<Dir, [number, number]> = {
  N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1],
};
const opp: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };

const mapDirs: Record<TileType, Dir[][]> = {
  end:      [['N'], ['E'], ['S'], ['W']],
  straight: [['N','S'], ['E','W'], ['N','S'], ['E','W']],
  corner:   [['N','E'], ['E','S'], ['S','W'], ['W','N']],
  tee:      [['N','E','W'], ['E','S','N'], ['S','W','E'], ['W','N','S']],
  cross:    [['N','E','S','W'], ['N','E','S','W'], ['N','E','S','W'], ['N','E','S','W']],
  block:    [[], [], [], []],
};

export function tileDirs(t: Tile): Dir[] { return mapDirs[t.type][t.rot]; }
function inBounds(r: number, c: number, R: number, C: number): boolean { return r >= 0 && c >= 0 && r < R && c < C; }

export function connectedFromStart(grid: Grid): Set<string> {
  const R = grid.length, C = grid[0]?.length ?? 0;
  const seen = new Set<string>();
  const q: [number, number][] = [[0, 0]];
  while (q.length) {
    const [r, c] = q.shift()!;
    const key = `${r},${c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const d of tileDirs(grid[r][c])) {
      const [dr, dc] = dirVec[d];
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc, R, C)) continue;
      if (tileDirs(grid[nr][nc]).includes(opp[d])) q.push([nr, nc]);
    }
  }
  return seen;
}

export function isConnectedStartToEnd(grid: Grid): boolean {
  const R = grid.length, C = grid[0]?.length ?? 0;
  const seen = connectedFromStart(grid);
  return seen.has(`${R - 1},${C - 1}`);
}

/** Find the unique path from start (0,0) to end (R-1,C-1) in the CURRENT rotations. */
export function pathStartToEnd(grid: Grid): Set<string> {
  const R = grid.length, C = grid[0]?.length ?? 0;
  const endKey = `${R - 1},${C - 1}`;
  const parent = new Map<string, string | null>();
  const q: [number, number][] = [[0, 0]];
  parent.set('0,0', null);

  while (q.length) {
    const [r, c] = q.shift()!;
    const here = `${r},${c}`;
    if (here === endKey) break;

    for (const d of tileDirs(grid[r][c])) {
      const [dr, dc] = dirVec[d];
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc, R, C)) continue;
      if (!tileDirs(grid[nr][nc]).includes(opp[d])) continue;
      const nk = `${nr},${nc}`;
      if (!parent.has(nk)) {
        parent.set(nk, here);
        q.push([nr, nc]);
      }
    }
  }

  if (!parent.has(endKey)) return new Set(); // not solved
  const path = new Set<string>();
  let cur: string | null = endKey;
  while (cur) { path.add(cur); cur = parent.get(cur) ?? null; }
  return path;
}

// ---------- MAZE GENERATOR (DFS perfect maze + random blocks) ----------
type MazeOpts = { rows: number; cols: number; blockFraction: number; seed?: number };
function rng(seed = Math.floor(Math.random() * 1e9)) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff; }
type Adj = Record<string, Set<Dir>>;
function keyOf(r: number, c: number) { return `${r},${c}`; }
function shuffle<T>(arr: T[], rnd: () => number): T[] { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

function buildMaze(opts: MazeOpts): { adj: Adj; blocks: Set<string> } {
  const { rows: R, cols: C } = opts;
  const rnd = rng(opts.seed);
  let attempts = 0;

  while (attempts++ < 50) {
    const blocks = new Set<string>();
    const total = Math.floor(opts.blockFraction * R * C);
    while (blocks.size < total) {
      const r = Math.floor(rnd() * R), c = Math.floor(rnd() * C);
      if ((r === 0 && c === 0) || (r === R - 1 && c === C - 1)) continue;
      blocks.add(keyOf(r, c));
    }

    const visited = Array.from({ length: R }, () => Array(C).fill(false));
    const adj: Adj = {};
    const start: [number, number] = [0, 0];
    if (blocks.has(keyOf(0, 0)) || blocks.has(keyOf(R - 1, C - 1))) continue;

    const stack: [number, number][] = [start];
    visited[0][0] = true;

    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const neigh: [number, number, Dir][] = [];
      if (inBounds(r - 1, c, R, C) && !visited[r - 1][c] && !blocks.has(keyOf(r - 1, c))) neigh.push([r - 1, c, 'N']);
      if (inBounds(r, c + 1, R, C) && !visited[r][c + 1] && !blocks.has(keyOf(r, c + 1))) neigh.push([r, c + 1, 'E']);
      if (inBounds(r + 1, c, R, C) && !visited[r + 1][c] && !blocks.has(keyOf(r + 1, c))) neigh.push([r + 1, c, 'S']);
      if (inBounds(r, c - 1, R, C) && !visited[r][c - 1] && !blocks.has(keyOf(r, c - 1))) neigh.push([r, c - 1, 'W']);

      shuffle(neigh, rnd);

      if (!neigh.length) {
        stack.pop();
      } else {
        const [nr, nc, d] = neigh[0];
        visited[nr][nc] = true;
        const aKey = keyOf(r, c), bKey = keyOf(nr, nc);
        (adj[aKey] ??= new Set()).add(d);
        (adj[bKey] ??= new Set()).add(opp[d]);
        stack.push([nr, nc]);
      }
    }

    if (visited[R - 1][C - 1]) return { adj, blocks };
  }
  return buildMaze({ ...opts, blockFraction: 0 });
}

function inferTypeRotFromDirs(dirs: Dir[]): { type: TileType; rot: 0|1|2|3 } {
  const want = [...dirs].sort().join(',');
  const types: TileType[] = ['end', 'straight', 'corner', 'tee', 'cross'];
  for (const t of types) for (let r = 0 as 0|1|2|3; r < 4; r = ((r + 1) as 0|1|2|3)) {
    const have = [...mapDirs[t][r]].sort().join(',');
    if (have === want) return { type: t, rot: r };
  }
  return { type: 'block', rot: 0 };
}

export function generateMazeGrid(rows: number, cols: number, blockFraction = 0.12, seed?: number): Grid {
  const { adj, blocks } = buildMaze({ rows, cols, blockFraction, seed });
  const rnd = rng(seed);
  const grid: Grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const k = keyOf(r, c);
      if (blocks.has(k)) return { type: 'block', rot: 0 } as Tile;
      const dirs = Array.from(adj[k] ?? []);
      if (dirs.length === 0) return { type: 'block', rot: 0 } as Tile;
      const base = inferTypeRotFromDirs(dirs);
      const spin = (Math.floor(rnd() * 4) as 0|1|2|3);
      return { type: base.type, rot: spin } as Tile;
    })
  );

  grid[0][0] = { type: 'end', rot: 2 };                    // A opens down
  grid[rows - 1][cols - 1] = { type: 'end', rot: 0 };      // B opens up
  return grid;
}
