import { useEffect, useMemo, useRef, useState } from "react";
import { pieceMoods, pieceSrc, reactionsEnabled } from "@/lib/reactions";
import { Side } from "@/lib/stats";
import { MoveClassification } from "@/types/enums";
import ClassBadge from "./ClassBadge";

export interface BoardPiece {
  id: string;
  square: string; // "e4"
  type: string; // p n b r q k
  color: "w" | "b";
}

/** A square outlined and tinted in a colour, used for feedback and for squares you mark yourself. */
export interface SquareMark {
  square: string;
  color: string;
}

/** A label on the board: an icon on the corner of a square and/or a short pill above it ("Checkmate", "Great!"). */
export interface Callout {
  square: string;
  color: string;
  text?: string;
  icon?: "crown" | "mate" | "clock" | "flag" | "draw";
}

const CALLOUT_ICON: Record<NonNullable<Callout["icon"]>, string> = {
  crown: "M4 17h16l1-9-5 4-4-7-4 7-5-4z M5 19h14v2H5z",
  mate: "M9 3h2l-.5 5h3L14 3h2l-.5 5H19v2h-3.7l-.4 4H18v2h-3.3L14 21h-2l.5-5h-3L9 21H7l.5-5H5v-2h2.7l.4-4H5V8h3.3zM10.3 10l-.4 4h3l.4-4z",
  clock: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm-1 4v6l5 3 1-1.6-4-2.4V7z",
  flag: "M5 3h2v18H5zM8 4h10l-2 4 2 4H8z",
  draw: "M5 11h14v2H5z M7 6h10v2H7z M7 16h10v2H7z",
};

export interface Arrow {
  from: string;
  to: string;
  color: string;
}

const fileOf = (sq: string) => sq.charCodeAt(0) - 97;
const rankOf = (sq: string) => Number(sq[1]) - 1;
const squareName = (file: number, rank: number) => String.fromCharCode(97 + file) + (rank + 1);

/** Pieces from a FEN, ids are "type+square" (no tracking across moves). */
export function piecesFromFen(fen: string, idPrefix = "f"): BoardPiece[] {
  const out: BoardPiece[] = [];
  fen.split(" ")[0].split("/").forEach((row, r) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { file += Number(ch); continue; }
      const sq = squareName(file, 7 - r);
      out.push({ id: `${idPrefix}${ch}${sq}`, square: sq, type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? "w" : "b" });
      file++;
    }
  });
  return out;
}

/** One piece list per position, with stable ids so pieces slide between moves. */
/** `start` keeps the ids of pieces already on the board (a line starting inside a game), so only moved pieces glide. */
export function buildFrames(startFen: string, uciMoves: string[], start?: BoardPiece[]): BoardPiece[][] {
  let current = start ?? piecesFromFen(startFen, "s").map((p, i) => ({ ...p, id: `p${i}` }));
  const frames = [current];
  for (const uci of uciMoves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci[4];
    const mover = current.find((p) => p.square === from);
    let next = current.filter((p) => p.square !== to);
    if (mover) {
      if (mover.type === "p" && from[0] !== to[0] && !current.some((p) => p.square === to)) {
        next = next.filter((p) => p.square !== to[0] + from[1]); // en passant
      }
      if (mover.type === "k" && Math.abs(fileOf(to) - fileOf(from)) === 2) {
        const rookFrom = (to[0] === "g" ? "h" : "a") + from[1];
        const rookTo = (to[0] === "g" ? "f" : "d") + from[1];
        next = next.map((p) => (p.square === rookFrom ? { ...p, square: rookTo } : p));
      }
      next = next.map((p) => (p.id === mover.id ? { ...p, square: to, type: promo ?? p.type } : p));
    }
    current = next;
    frames.push(current);
  }
  return frames;
}

interface Props {
  pieces: BoardPiece[];
  orientation: Side;
  pieceSet: string;
  lastMove?: { from: string; to: string };
  /** Accent color for the last move squares and the moved piece (e.g. the move class color). */
  highlight?: string;
  badge?: { square: string; cls: MoveClassification };
  /** Labels on squares, e.g. a crown on the winner's king and the reason the game ended on the loser's. */
  callouts?: Callout[];
  /** Changes every move; restarts the one-shot move animations. */
  animKey?: number | string;
  /** Mood of the last move: "great" sparkles, "good" ripples, "bad" shakes the board. */
  effect?: "great" | "good" | "bad";
  /** A piece that was just captured, shown fading out where it stood. */
  captured?: BoardPiece;
  arrows?: Arrow[];
  /** Squares to mark (feedback from the app). You can also mark squares yourself with a right click. */
  marks?: SquareMark[];
  selected?: string;
  targets?: string[];
  onSquareClick?: (square: string) => void;
  /** Dragging: which squares may be picked up, what happens when one is, and when it is dropped. */
  canDrag?: (square: string) => boolean;
  onDragStart?: (square: string) => void;
  onDragMove?: (from: string, to: string) => void;
}

export default function Board({ pieces, orientation, pieceSet, lastMove, highlight = "#f5c120", badge, callouts = [], animKey, effect, captured, arrows = [], marks = [], selected, targets = [], onSquareClick, canDrag, onDragStart, onDragMove }: Props) {
  const flipped = orientation === "black";
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ from: string; px: number; py: number } | null>(null);
  const dragInfo = useRef<{ from: string; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // Your own drawing: right-drag an arrow, right-click a square. Blue by default, shift red, alt yellow, ctrl green.
  const [drawn, setDrawn] = useState<{ arrows: Arrow[]; squares: SquareMark[] }>({ arrows: [], squares: [] });
  const rightStart = useRef<{ sq: string; color: string } | null>(null);
  const signature = pieces.map((p) => p.id + p.square).join(",");
  // Blokje pieces react to the position (see lib/reactions).
  const moods = useMemo(() => pieceMoods(pieces, pieceSet, captured && lastMove ? lastMove.to : undefined), [signature, pieceSet, captured, lastMove?.to, reactionsEnabled()]);
  useEffect(() => setDrawn({ arrows: [], squares: [] }), [signature]);
  const drawColor = (e: React.PointerEvent) => (e.shiftKey ? "#e5384f" : e.altKey ? "#f5c120" : e.ctrlKey || e.metaKey ? "#22c58b" : "#3f7bf2");

  // A short shake on mistakes and blunders (skipped for reduced motion).
  useEffect(() => {
    if (effect !== "bad" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }],
      { duration: 380, easing: "ease-out" }
    );
  }, [animKey, effect]);

  // Returns the top-left corner of a square in board units (0..8).
  const pos = (sq: string) => {
    const f = fileOf(sq);
    const r = rankOf(sq);
    return { x: flipped ? 7 - f : f, y: flipped ? r : 7 - r };
  };
  const pct = (n: number) => `${n * 12.5}%`;

  const squareAt = (clientX: number, clientY: number): string | undefined => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return undefined;
    const fx = Math.floor(((clientX - r.left) / r.width) * 8);
    const fy = Math.floor(((clientY - r.top) / r.height) * 8);
    if (fx < 0 || fx > 7 || fy < 0 || fy > 7) return undefined;
    return squareName(flipped ? 7 - fx : fx, flipped ? fy : 7 - fy);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) {
      const start = squareAt(e.clientX, e.clientY);
      if (start) rightStart.current = { sq: start, color: drawColor(e) };
      return;
    }
    if (e.button === 0 && (drawn.arrows.length || drawn.squares.length)) setDrawn({ arrows: [], squares: [] });
    if (!canDrag || e.button !== 0) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (!sq || !canDrag(sq) || !pieces.some((p) => p.square === sq)) return;
    dragInfo.current = { from: sq, startX: e.clientX, startY: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragInfo.current;
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5) return;
      d.moved = true;
      ref.current?.setPointerCapture(e.pointerId);
      onDragStart?.(d.from);
    }
    const r = ref.current!.getBoundingClientRect();
    setDrag({ from: d.from, px: e.clientX - r.left, py: e.clientY - r.top });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.button === 2 && rightStart.current) {
      const { sq: from, color } = rightStart.current;
      rightStart.current = null;
      const to = squareAt(e.clientX, e.clientY);
      if (!to) return;
      setDrawn((d) => {
        if (to === from) {
          const same = d.squares.find((s) => s.square === to);
          const rest = d.squares.filter((s) => s.square !== to);
          return { ...d, squares: same && same.color === color ? rest : [...rest, { square: to, color }] };
        }
        const same = d.arrows.find((a) => a.from === from && a.to === to);
        const rest = d.arrows.filter((a) => !(a.from === from && a.to === to));
        return { ...d, arrows: same && same.color === color ? rest : [...rest, { from, to, color }] };
      });
      return;
    }
    const d = dragInfo.current;
    dragInfo.current = null;
    if (!d?.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 60);
    setDrag(null);
    const to = squareAt(e.clientX, e.clientY);
    if (to && to !== d.from) onDragMove?.(d.from, to);
  };

  const squares = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = squareName(f, r);
      const { x, y } = pos(sq);
      const dark = (f + r) % 2 === 0;
      const cls = ["sq", dark ? "dark" : "light"];
      if (lastMove && sq === lastMove.from) cls.push("last-from");
      if (lastMove && sq === lastMove.to) cls.push("last-to");
      if (sq === selected) cls.push("selected");
      squares.push(
        <div key={sq} className={cls.join(" ")} style={{ left: pct(x), top: pct(y), ["--hl" as string]: highlight }} onClick={() => (suppressClick.current ? (suppressClick.current = false) : onSquareClick?.(sq))}>
          {targets.includes(sq) && <span className="target" />}
        </div>
      );
    }
  }

  const files = "abcdefgh";
  return (
    <div className={`board ${canDrag ? "draggable" : ""}`} ref={ref} onContextMenu={(e) => e.preventDefault()} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { dragInfo.current = null; setDrag(null); }}>
      {squares}
      {[...marks, ...drawn.squares].map((m, i) => (
        <div key={`mark-${m.square}-${i}`} className="mark" style={{ left: pct(pos(m.square).x), top: pct(pos(m.square).y), ["--mc" as string]: m.color }} />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span key={`c${i}`}>
          <span className="coord coord-file" style={{ left: pct(i), top: "calc(100% - 1.1em)" }}>{files[flipped ? 7 - i : i]}</span>
          <span className="coord coord-rank" style={{ left: 2, top: pct(i) }}>{flipped ? i + 1 : 8 - i}</span>
        </span>
      ))}
      {captured && (
        <div key={`ghost-${animKey}-${captured.id}`} className="piece ghost" style={{ transform: `translate(${pos(captured.square).x * 100}%, ${pos(captured.square).y * 100}%)` }}>
          <img alt="" draggable={false} src={`pieces/${pieceSet}/${captured.color}${captured.type.toUpperCase()}.svg`} />
        </div>
      )}
      {lastMove && effect && (
        <div
          key={`burst-${animKey}`}
          className={`burst ${effect}`}
          style={{ left: pct(pos(lastMove.to).x), top: pct(pos(lastMove.to).y), ["--hl" as string]: highlight }}
        />
      )}
      {pieces.map((p) => {
        const { x, y } = pos(p.square);
        const cls = ["piece"];
        if (p.square === selected) cls.push("lifted");
        if (lastMove && p.square === lastMove.to) cls.push("moved");
        if (drag?.from === p.square) cls.push("dragging");
        const mood = moods.get(p.id);
        if (mood) cls.push(`react-${mood}`);
        return (
          <div key={p.id} className={cls.join(" ")} style={{ transform: `translate(${x * 100}%, ${y * 100}%)`, ["--hl" as string]: highlight }}>
            <img key={cls.includes("moved") ? `moved-${animKey}` : "static"} alt="" draggable={false} src={pieceSrc(pieceSet, p, mood)} />
          </div>
        );
      })}
      {drag && (() => {
        const piece = pieces.find((p) => p.square === drag.from);
        return piece ? (
          <img className="drag-ghost" alt="" draggable={false} src={`pieces/${pieceSet}/${piece.color}${piece.type.toUpperCase()}.svg`} style={{ left: drag.px, top: drag.py }} />
        ) : null;
      })()}
      <svg className="arrows" viewBox="0 0 8 8">
        {[...arrows, ...drawn.arrows].map((a, i) => {
          if (a.from === a.to) return null;
          const s = pos(a.from);
          const e = pos(a.to);
          const x1 = s.x + 0.5, y1 = s.y + 0.5, x2 = e.x + 0.5, y2 = e.y + 0.5;
          const len = Math.hypot(x2 - x1, y2 - y1);
          const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
          const hx = x2 - ux * 0.3, hy = y2 - uy * 0.3;
          return (
            <g key={`${a.from}${a.to}${i}`} className="arrow" opacity="0.85">
              <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={a.color} strokeWidth="0.2" strokeLinecap="round" />
              <polygon
                points={`${x2},${y2} ${hx - uy * 0.2},${hy + ux * 0.2} ${hx + uy * 0.2},${hy - ux * 0.2}`}
                fill={a.color}
              />
            </g>
          );
        })}
      </svg>
      {badge && (
        <div key={`badge-${animKey}`} className="badge-pos" style={{ left: pct(pos(badge.square).x + 0.56), top: pct(pos(badge.square).y - 0.12) }}>
          <ClassBadge cls={badge.cls} size={0} />
        </div>
      )}
      {callouts.map((c) => {
        const at = pos(c.square);
        return (
          <div key={`callout-${c.square}-${c.text ?? c.icon}`} className={`callout ${at.y < 0.5 ? "top" : ""}`} style={{ left: pct(at.x), top: pct(at.y), ["--cc" as string]: c.color }}>
            {c.text && <span className={`callout-text ${at.y < 0.5 ? "below" : ""}`}>{c.text}</span>}
            {c.icon && (
              <span className="callout-icon">
                <svg viewBox="0 0 24 24" aria-hidden><path d={CALLOUT_ICON[c.icon]} fill="#fff" fillRule="evenodd" /></svg>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
