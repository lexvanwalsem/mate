import { ReactNode } from "react";
import { MoveClassification as MC } from "@/types/enums";
import { CLASS_META, classLabel } from "./classes";

// Glyphs are drawn in a 24x24 box, white strokes, round caps.
const Excl = ({ x = 12, s = 1 }: { x?: number; s?: number }) => (
  <g transform={`translate(${x} 12) scale(${s}) translate(-12 -12)`}>
    <path d="M12 5.5v8" />
    <circle cx="12" cy="18.2" r="0.6" />
  </g>
);

const Quest = ({ x = 12, s = 1 }: { x?: number; s?: number }) => (
  <g transform={`translate(${x} 12) scale(${s}) translate(-12 -12)`}>
    <path d="M8.8 9a3.3 3.3 0 1 1 5 2.8c-1.2.8-1.8 1.4-1.8 2.8" />
    <circle cx="12" cy="18.2" r="0.6" />
  </g>
);

const GLYPHS: Record<MC, ReactNode> = {
  [MC.Splendid]: <><Excl x={8} s={0.9} /><Excl x={16} s={0.9} /></>,
  [MC.Perfect]: <Excl />,
  [MC.Best]: <path d="M12 4.5l2.2 5 5.3.5-4 3.6 1.2 5.3L12 16.2 7.3 18.9l1.2-5.3-4-3.6 5.3-.5z" fill="#fff" strokeWidth="1.2" />,
  [MC.Excellent]: <path d="M6 12.5l4 4 8-9" />,
  [MC.Okay]: <circle cx="12" cy="12" r="3.6" fill="#fff" stroke="none" />,
  [MC.Opening]: <path d="M12 7c-2-1.4-4.5-1.6-7-1v11c2.5-.6 5-.4 7 1m0-11c2-1.4 4.5-1.6 7-1v11c-2.5-.6-5-.4-7 1m0-11v11" strokeWidth="1.8" />,
  [MC.Forced]: <path d="M5.5 12h12M13 7l5 5-5 5" />,
  [MC.Inaccuracy]: <><Quest x={8} s={0.9} /><Excl x={17} s={0.9} /></>,
  [MC.Mistake]: <Quest />,
  [MC.Miss]: <path d="M7 7l10 10M17 7L7 17" />,
  [MC.Blunder]: <><Quest x={8} s={0.9} /><Quest x={16} s={0.9} /></>,
};

/** Rounded square badge with a drawn glyph. size 0 means "fill the parent" (used on the board). */
export default function ClassBadge({ cls, size = 22 }: { cls: MC; size?: number }) {
  const m = CLASS_META[cls];
  const box = size ? { width: size, height: size } : undefined;
  return (
    <span className="class-badge" style={{ background: m.color, ...box }} title={classLabel(cls)}>
      <svg viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {GLYPHS[cls]}
      </svg>
    </span>
  );
}
