import { GameAnalysis } from "@/lib/analyze";
import { Side, winPctFor } from "@/lib/stats";
import { MoveClassification as MC } from "@/types/enums";
import { CLASS_META } from "./classes";

/** Vertical bar, the user's side is at the bottom. */
export function EvalBar({ whitePct, label, side }: { whitePct: number; label: string; side: Side }) {
  const myPct = side === "white" ? whitePct : 100 - whitePct;
  const meWinning = myPct >= 50;
  return (
    <div className={`evalbar side-${side}`}>
      <div className="evalbar-me" style={{ height: `${myPct}%` }} />
      <span className={`evalbar-label ${meWinning ? "bottom" : "top"}`}>{label}</span>
    </div>
  );
}

const W = 600;
const H = 120;

/** Win chance of the user over the game. Click to jump to a move. */
export function EvalGraph({ a, side, current, onSelect }: { a: GameAnalysis; side: Side; current: number; onSelect: (p: number) => void }) {
  const n = a.positions.length;
  const x = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * W);
  const y = (pct: number) => H - (pct / 100) * H;
  const pts = a.positions.map((_, i) => `${x(i)},${y(winPctFor(a, i, side))}`);
  const flagged = a.positions
    .map((p, i) => ({ i, cls: p.moveClassification }))
    .filter((m) => m.cls && [MC.Blunder, MC.Mistake, MC.Miss, MC.Splendid].includes(m.cls) && ((m.i - 1) % 2 === 0) === (side === "white"));

  return (
    <svg
      className={`graph side-${side}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onSelect(Math.round(((e.clientX - r.left) / r.width) * (n - 1)));
      }}
    >
      <rect width={W} height={H} className="graph-bg" />
      <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} className="graph-area" />
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="graph-mid" />
      <polyline points={pts.join(" ")} className="graph-line" fill="none" />
      {flagged.map((m) => (
        <circle key={m.i} cx={x(m.i)} cy={y(winPctFor(a, m.i, side))} r="5" fill={CLASS_META[m.cls!].color} className="graph-dot" />
      ))}
      <line x1={x(current)} x2={x(current)} y1="0" y2={H} className="graph-cursor" />
    </svg>
  );
}
