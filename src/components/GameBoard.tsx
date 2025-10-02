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
// Returns a Set of "r,c" for tiles on that path; empty if no path.
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

  // ===== Fit the board inside the padded container (no horizontal scroll) =====
  const hudRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(320);

  useLayoutEffect(() => {
    const update = () => {
      const containerW = wrapperRef.current?.clientWidth ?? window.innerWidth;
      const vh = Math.min(window.innerHeight, document.documentElement.clientHeight);
      const hudH = hudRef.current?.getBoundingClientRect().height ?? 0;

      const sideBreathing = 8;  // small buffer so the board never kisses the edges
      const verticalPad   = 32; // spacing below HUD

      // maximum square we can fit inside container width and viewport height
      const maxW = containerW - sideBreathing;
      const maxH = vh - hudH - verticalPad - 24;
      const size = Math.max(220, Math.floor(Math.min(maxW, maxH)));

      setBoardSize(size);
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
    <div className="w-full max-w-xl mx-auto">
      {/* HUD */}
      <div ref={hudRef} className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="px-3 py-1 rounded-full bg-white/5 text-white/80">
            Moves: <b>{moves}</b>
          </span>

          <span
            className={`px-3 py-1 rounded-full ${
              solved ? 'bg-primary/30 text-primary font-medium' : 'bg-white/5 text-white/70'
            }`}
          >
            {solved
              ? "Arianna, you're awesome and you finished the game. Start a new one! Love, Nathan"
              : 'Not connected'}
          </span>
        </div>

        {/* Difficulty selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="diff" className="text-white/60 text-sm">Level</label>
          <select
            id="diff"
            className="bg-white/10 text-white/90 border border-white/10 rounded-xl px-2 py-1"
            value={difficulty}
            onChange={(e) => newBoard(e.target.value as Difficulty)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <button
            onClick={() => newBoard(difficulty)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 border border-white/10"
          >
            New board
          </button>
        </div>
      </div>

      {/* Board wrapper measured inside app-shell padding */}
      <div ref={wrapperRef} className="w-full flex justify-center">
        <div
          style={{ width: boardSize, height: boardSize }}
          className="overflow-hidden rounded-2xl"
        >
          <div
            className="grid gap-1.5 sm:gap-2 h-full"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {grid.map((row, r) =>
              row.map((tile, c) => {
                const key = `${r},${c}`;
                const highlighted = connected.has(key);
                const onSolvedPath = solved && solvedPath.has(key);
                const isStart = r === 0 && c === 0;
                const isEnd   = r === rows - 1 && c === cols - 1;

                return (
                  <TileView
                    key={key}
                    tile={tile}
                    highlighted={highlighted}
                    pathOn={onSolvedPath}
                    isStart={isStart}
                    isEnd={isEnd}
                    onRotate={() => rotateAt(r, c)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-white/60 text-sm">
        Rotate pieces to connect <span className="text-primary font-medium">A</span> to{' '}
        <span className="text-accent font-medium">B</span>. Some tiles are <em>blocked</em> to force a maze path.
      </p>
    </div>
  );
}
