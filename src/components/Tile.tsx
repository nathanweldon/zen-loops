// src/components/Tile.tsx
import type { Tile } from '../lib/pathfind';

type Props = {
  tile: Tile;
  onRotate: () => void;
  highlighted?: boolean;
  pathOn?: boolean;   // color the lines when on solved path
  isStart?: boolean;  // A
  isEnd?: boolean;    // B
  strokePx?: number;  // <-- NEW: dynamic stroke width
};

export default function TileView({ tile, onRotate, highlighted, pathOn, isStart, isEnd, strokePx }: Props) {
  const deg = tile.rot * 90;
  const isBlock = tile.type === 'block';

  // Line color: teal on solved path, white otherwise
  const stroke = pathOn ? '#34d399' : 'white';
  const sw = strokePx ?? 8; // default 8 if not provided

  return (
    <button
      aria-label={
        isBlock
          ? 'Blocked tile'
          : `Tile ${tile.type}, rotation ${deg} degrees. Press Enter/Space or tap to rotate.`
      }
      onClick={() => { if (!isBlock) onRotate(); }}
      onKeyDown={(e) => {
        if (isBlock) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRotate(); }
      }}
      disabled={isBlock}
      className={[
        "relative rounded-2xl border shadow-soft",
        isBlock ? "bg-black/50 border-white/10 cursor-not-allowed" : "bg-[#111827CC] border-white/5",
        "flex items-center justify-center select-none",
        "transition-transform duration-150",
        isBlock ? "" : "active:scale-95",
        highlighted && !isBlock ? "ring-2 ring-primary/60" : "ring-0",
        isStart ? "outline outline-1 outline-primary/70" : "",
        isEnd ?   "outline outline-1 outline-accent/70"  : "",
        "w-full h-full" // exact pixel sizing comes from the wrapper
      ].join(" ")}
    >
      {isBlock ? (
        // Blocked tile: subtle X
        <svg viewBox="0 0 64 64" className="w-2/3 h-2/3 opacity-40">
          <line x1="18" y1="18" x2="46" y2="46" stroke="white" strokeWidth={Math.max(2, sw - 2)} strokeLinecap="round" />
          <line x1="46" y1="18" x2="18" y2="46" stroke="white" strokeWidth={Math.max(2, sw - 2)} strokeLinecap="round" />
        </svg>
      ) : (
        // Rotatable pipe tile
        <svg viewBox="0 0 64 64" className="w-5/6 h-5/6">
          <g style={{ transform: `rotate(${deg}deg)`, transformOrigin: '32px 32px' }}>
            {tile.type === 'end' && (
              <line x1="32" y1="14" x2="32" y2="32" stroke={stroke} strokeOpacity="0.95" strokeWidth={sw} strokeLinecap="round" />
            )}
            {tile.type === 'straight' && (
              <line x1="32" y1="6" x2="32" y2="58" stroke={stroke} strokeOpacity="0.95" strokeWidth={sw} strokeLinecap="round" />
            )}
            {tile.type === 'corner' && (
              <>
                <line x1="32" y1="6"  x2="32" y2="32" stroke={stroke} strokeOpacity="0.95" strokeWidth={sw} strokeLinecap="round" />
                <line x1="32" y1="32" x2="58" y2="32" stroke={stroke} strokeOpacity="0.95" strokeWidth={sw} strokeLinecap="round" />
              </>
            )}
            {tile.type === 'tee' && (
              <>
                <line x1="8"  y1="32" x2="56" y2="32" stroke={stroke} strokeOpacity="0.95" strokeWidth={sw} strokeLinecap="round" />
                <line x1="32" y1="6"  x2="32" y2="32" stroke={stroke} strokeOpacity="0.95" strokeWidth={sw} strokeLinecap="round" />
              </>
            )}
            {tile.type === 'cross' && (
              <>
                <line x1="8"  y1="32" x2="56" y2="32" stroke={stroke} strokeOpacity="0.95" strokeWidth={sw} strokeLinecap="round" />
                <line x1="32" y1="8"  x2="32" y2="56" stroke={stroke} strokeOpacity="0.95" strokeWidth={sw} strokeLinecap="round" />
              </>
            )}
          </g>
        </svg>
      )}

      {/* A / B badges */}
      {isStart && <span className="absolute left-1.5 top-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">A</span>}
      {isEnd &&   <span className="absolute right-1.5 bottom-1.5 text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">B</span>}
    </button>
  );
}
