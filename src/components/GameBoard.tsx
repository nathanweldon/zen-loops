// src/components/GameBoard.tsx
import { useEffect, useMemo, useState, useLayoutEffect, useRef } from 'react';
import TileView from './Tile';

import type { Grid, Dir } from '../lib/pathfind';
import { tileDirs, generateMazeGrid, connectedFromStart } from '../lib/pathfind';

// ----- difficulty config -----
type Difficulty = 'easy' | 'medium' | 'hard';
const DIFFS: Record<Difficulty, { rows: number; cols: number; blockFraction: number }> = {
  easy:   { rows: 5, cols: 5, blockFraction: 0.08 },
  medium: { rows: 6, cols: 6, blockFraction: 0.14 },
  hard:   { rows: 7, cols: 7, blockFraction: 0.20 },
};

function makeGridFor(d: Difficulty): Grid {
  const cfg = DIFFS[d];
  return generateMazeGrid(cfg.rows, cfg.cols, cfg.blockFraction);
}

// ----- helpers -----
const dirVec: Record<Dir, [number, number]> = {
  N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1],
};
const opp: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const keyOf = (r: number, c: number) => `${r},${c}`;
const inBounds = (r: number, c: number, R: number, C: number) => r >= 0 && c >= 0 && r < R && c < C;

// Find ONE valid path from A(0,0) to B(R-1,C-1) following current rotations.
function computeSolvedPath(grid: Grid): Set<string> {
  const R = grid.length, C = grid[0]?.length ?? 0;
  const start = keyOf(0, 0), goal = keyOf(R - 1, C - 1);
  const q: [number, number][] = [[0, 0]];
  const seen = new Set<string>([start]);
  const parent = new Map<string, string>();

  while (q.length) {
    const [r, c] = q.shift()!;
    const k = keyOf(r, c);
    if (k === goal) break;

    for (const d of tileDirs(grid[r][c])) {
      const [dr, dc] = dirVec[d];
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc, R, C)) continue;
      if (!tileDirs(grid[nr][nc]).includes(opp[d])) continue;

      const nk = keyOf(nr, nc);
      if (!seen.has(nk)) {
        seen.add(nk);
        parent.set(nk, k);
        q.push([nr, nc]);
      }
    }
  }

  if (!parent.has(goal) && start !== goal) return new Set();
  const path = new Set<string>();
  let cur = goal;
  path.add(cur);
  while (cur !== start) {
    const p = parent.get(cur);
    if (!p) return new Set();
    path.add(p);
    cur = p;
  }
  return path;
}

function save(d: Difficulty, g: Grid) {
  localStorage.setItem(`zenloops:${d}`, JSON.stringify(g));
}
function load(d: Difficulty): Grid | null {
  try {
    const raw = localStorage.getItem(`zenloops:${d}`);
    return raw ? (JSON.parse(raw) as Grid) : null;
  } catch { return null; }
}

export default function GameBoard() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [grid, setGrid] = useState<Grid>(() => load('easy') ?? makeGridFor('easy'));
  const [moves, setMoves] = useState(0);

  useEffect(() => { save(difficulty, grid); }, [grid, difficulty]);

  const connected = useMemo(() => connectedFromStart(grid), [grid]);
  const solvedPath = useMemo(() => computeSolvedPath(grid), [grid]);
  const solved = solvedPath.size > 0;

  // ===== Fit exactly: compute per-tile size including gaps =====
  const hudRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tileSize, setTileSize] = useState(40);
  const [boardW, setBoardW] = useState(0);
  const [boardH, setBoardH] = useState(0);

  useLayoutEffect(() => {
    const update = () => {
      const rows = grid.length;
      const cols = grid[0]?.length ?? 0;
      if (!rows || !cols) return;

      const vw = Math.floor(window.visualViewport?.width ?? window.innerWidth);
      const vh = Math.floor(window.visualViewport?.height ?? window.innerHeight);
      const innerW = Math.floor(containerRef.current?.clientWidth ?? vw);
      const hudH = Math.ceil(hudRef.current?.getBoundingClientRect().height ?? 0);

      // Spacing constants (tweak as desired)
      const GAP = 6;             // px between tiles
      const SIDE_BUFFER = 8;     // keep off the edges inside the container
      const VERT_BUFFER = 28;    // space below HUD and bottom safe area

      const maxW = innerW - SIDE_BUFFER;
      const maxH = vh - hudH - VERT_BUFFER;

      // per-tile size that fits both width and height after subtracting gaps
      const sizeW = (maxW - GAP * (cols - 1)) / cols;
      const sizeH = (maxH - GAP * (rows - 1)) / rows;
      const size = Math.floor(Math.max(18, Math.min(sizeW, sizeH)));

      setTileSize(size);
      setBoardW(size * cols + GAP * (cols - 1));
      setBoardH(size * rows + GAP * (rows - 1));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [grid.length, grid[0]?.length]);

  function rotateAt(r: number, c: number) {
    setGrid(prev => {
      const t = prev[r][c];
      if (t.type === 'block') return prev; // can't rotate blocks
      const next = prev.map(row => row.slice());
      next[r][c] = { ...t, rot: ((t.rot + 1) % 4) as 0|1|2|3 };
      return next;
    });
    setMoves(m => m + 1);
  }

  function newBoard(d: Difficulty) {
    const g = makeGridFor(d);
    setGrid(g); setMoves(0); setDifficulty(d); save(d, g);
  }

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  return (
    <div className="w-full">
      {/* Status line under header */}
      {solved && (
        <div className="mb-2 text-primary/90 text-sm">
          Arianna, you're awesome and you finished the game. Start a new one! Love, Nathan
        </div>
      )}

      {/* Controls/HUD (compact, so board can sit higher) */}
      <div ref={hudRef} className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/80 text-sm">
            Moves: <b>{moves}</b>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="diff" className="text-white/60 text-sm">Level</label>
          <select
            id="diff"
            className="bg-white/10 text-white/90 border border-white/10 rounded-xl px-2 py-1 text-sm"
            value={difficulty}
            onChange={(e) => newBoard(e.target.value as Difficulty)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <button
            onClick={() => newBoard(difficulty)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 border border-white/10 text-sm"
          >
            New board
          </button>
        </div>
      </div>

      {/* Board: left/top aligned; exact pixel width/height to include gaps */}
      <div ref={containerRef} className="w-full">
        <div
          style={{ width: boardW, height: boardH }}
          className="overflow-hidden"
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${tileSize}px)`,
              gridAutoRows: `${tileSize}px`,
              gap: '6px', // keep in sync with GAP above
            }}
          >
            {grid.map((row, r) =>
              row.map((tile, c) => {
                const key = `${r},${c}`;
                const highlighted = connected.has(key);
                const onSolvedPath = solved && solvedPath.has(key);
                const isStart = r === 0 && c === 0;
                const isEnd   = r === rows - 1 && c === cols - 1;

                return (
                  <div key={key} style={{ width: tileSize, height: tileSize }}>
                    <TileView
                      tile={tile}
                      highlighted={highlighted}
                      pathOn={onSolvedPath}
                      isStart={isStart}
                      isEnd={isEnd}
                      onRotate={() => rotateAt(r, c)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-white/60 text-sm">
        Rotate pieces to connect <span className="text-primary font-medium">A</span> to{' '}
        <span className="text-accent font-medium">B</span>. Some tiles are <em>blocked</em> to force a maze path.
      </p>
    </div>
  );
}
