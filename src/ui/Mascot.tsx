import { useState } from "react";
import { Mood } from "./classes";

interface Props {
  mood?: Mood;
  size?: number;
}

const INK = "#1f1b3a";

const Star = ({ cx, cy }: { cx: number; cy: number }) => (
  <polygon
    className="m-star"
    transform={`translate(${cx} ${cy})`}
    points="0,-15 4.5,-5 15,-4.5 7,3 9,14 0,8 -9,14 -7,3 -15,-4.5 -4.5,-5"
    fill="#ffd23f"
    stroke="#c98a00"
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

/** Eyes: white blocks, pupils drift on their own, the whole eye blinks on its own. */
function Eyes({ mood }: { mood: Mood }) {
  if (mood === "wow") {
    return (
      <g>
        <Star cx={78} cy={104} />
        <Star cx={122} cy={104} />
      </g>
    );
  }
  if (mood === "proud" || mood === "cheer") {
    return (
      <g fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round">
        <path d="M64 108 Q78 90 92 108" />
        <path d="M108 108 Q122 90 136 108" />
      </g>
    );
  }
  if (mood === "sleepy") {
    return (
      <g fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round">
        <path d="M64 108 L92 108" />
        <path d="M108 108 L136 108" />
      </g>
    );
  }
  const big = mood === "shocked";
  const look: Partial<Record<Mood, [number, number]>> = { thinking: [5, -5], oops: [0, 6], worried: [0, 3] };
  const [dx, dy] = look[mood] ?? [0, 0];
  const h = big ? 46 : 38;
  const pupil = big ? 6 : 10;
  return (
    <g className="m-eyes">
      <rect x="60" y={104 - h / 2} width="36" height={h} rx="14" fill="#fff" />
      <rect x="104" y={104 - h / 2} width="36" height={h} rx="14" fill="#fff" />
      <g className="m-pupils">
        <circle cx={78 + dx} cy={106 + dy} r={pupil} fill={INK} />
        <circle cx={122 + dx} cy={106 + dy} r={pupil} fill={INK} />
        <circle cx={81 + dx} cy={102 + dy} r="3" fill="#fff" />
        <circle cx={125 + dx} cy={102 + dy} r="3" fill="#fff" />
      </g>
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  const stroke = { fill: "none", stroke: INK, strokeWidth: 6, strokeLinecap: "round" as const };
  switch (mood) {
    case "happy":
    case "proud":
      return <path d="M82 138 Q100 158 118 138" {...stroke} />;
    case "cheer":
      return <path d="M80 136 Q100 166 120 136 Z" fill={INK} />;
    case "wow":
      return <rect x="86" y="136" width="28" height="22" rx="11" fill={INK} />;
    case "shocked":
      return <ellipse cx="100" cy="146" rx="11" ry="14" fill={INK} />;
    case "worried":
      return <path d="M84 148 Q92 140 100 148 Q108 156 116 148" {...stroke} />;
    case "oops":
      return <path d="M88 148 Q100 140 112 148" {...stroke} />;
    case "thinking":
      return <path d="M88 145 L112 145" {...stroke} />;
    case "sleepy":
      return <ellipse cx="100" cy="146" rx="7" ry="5" fill={INK} />;
    default:
      return <path d="M88 140 Q100 150 112 140" {...stroke} />;
  }
}

/** Blokje. Every part has its own class so CSS can animate them independently. */
export default function Mascot({ mood = "idle", size = 140 }: Props) {
  const [hop, setHop] = useState(0);
  return (
    <svg className={`mascot mascot-${mood} ${hop ? "hop" : ""}`} key={hop} onClick={() => setHop(hop + 1)} width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Blokje">
      <defs>
        <linearGradient id="mascot-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--m-top)" }} />
          <stop offset="1" style={{ stopColor: "var(--m-bottom)" }} />
        </linearGradient>
      </defs>
      <ellipse className="m-shadow" cx="100" cy="190" rx="58" ry="8" fill={INK} opacity="0.14" />
      <g className="m-root">
        <rect className="m-merlon m-merlon-1" x="36" y="22" width="30" height="44" rx="12" style={{ fill: "var(--m-mid)" }} />
        <rect className="m-merlon m-merlon-2" x="85" y="14" width="30" height="52" rx="12" style={{ fill: "var(--m-light)" }} />
        <rect className="m-merlon m-merlon-3" x="134" y="22" width="30" height="44" rx="12" style={{ fill: "var(--m-mid)" }} />
        <rect className="m-foot m-foot-l" x="52" y="160" width="32" height="26" rx="12" style={{ fill: "var(--m-dark)" }} />
        <rect className="m-foot m-foot-r" x="116" y="160" width="32" height="26" rx="12" style={{ fill: "var(--m-dark)" }} />
        <rect className="m-arm m-arm-l" x="14" y="104" width="30" height="42" rx="14" style={{ fill: "var(--m-mid)" }} />
        <rect className="m-arm m-arm-r" x="156" y="104" width="30" height="42" rx="14" style={{ fill: "var(--m-mid)" }} />
        <g className="m-body">
          <rect x="28" y="48" width="144" height="124" rx="46" fill="url(#mascot-body)" />
          <rect x="44" y="140" width="112" height="22" rx="11" fill="#fff" opacity="0.12" />
          <rect className="m-cheek" x="44" y="124" width="20" height="12" rx="6" fill="#ff8fa3" opacity="0.8" />
          <rect className="m-cheek" x="136" y="124" width="20" height="12" rx="6" fill="#ff8fa3" opacity="0.8" />
          <Eyes mood={mood} />
          {mood === "worried" && <path d="M54 76 L88 84 M146 76 L112 84" stroke={INK} strokeWidth="6" strokeLinecap="round" />}
          {mood === "thinking" && (
            <g className="m-brow" stroke={INK} strokeWidth="6" strokeLinecap="round">
              <path d="M58 82 L90 82" />
              <path d="M110 76 L142 66" />
            </g>
          )}
          {mood === "shocked" && <path className="m-drop" d="M164 70 Q170 84 164 90 Q158 84 164 70Z" fill="#7fd6ff" />}
          <g className="m-mouth">
            <Mouth mood={mood} />
          </g>
        </g>
        {mood === "sleepy" && (
          <text className="m-zzz" x="150" y="60" fontSize="26" fontWeight="700" fill="#7a76a0">
            z
          </text>
        )}
      </g>
    </svg>
  );
}
