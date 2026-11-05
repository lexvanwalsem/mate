import { Mood } from "./classes";

interface Props {
  mood?: Mood;
  size?: number;
}

const Star = ({ cx, cy }: { cx: number; cy: number }) => (
  <polygon
    transform={`translate(${cx} ${cy})`}
    points="0,-15 4.5,-5 15,-4.5 7,3 9,14 0,8 -9,14 -7,3 -15,-4.5 -4.5,-5"
    fill="#ffd23f"
    stroke="#c98a00"
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

function Eyes({ mood }: { mood: Mood }) {
  if (mood === "wow") {
    return (
      <g className="mascot-eyes-static">
        <Star cx={78} cy={104} />
        <Star cx={122} cy={104} />
      </g>
    );
  }
  if (mood === "proud") {
    return (
      <g fill="none" stroke="#1f1b3a" strokeWidth="7" strokeLinecap="round" className="mascot-eyes-static">
        <path d="M64 108 Q78 90 92 108" />
        <path d="M108 108 Q122 90 136 108" />
      </g>
    );
  }
  const big = mood === "shocked";
  const look: Record<string, [number, number]> = { thinking: [4, -5], oops: [0, 6], worried: [0, 3] };
  const [dx, dy] = look[mood] ?? [0, 0];
  const h = big ? 46 : 38;
  const pupil = big ? 6 : 10;
  return (
    <g className="mascot-eyes">
      <rect x="60" y={104 - h / 2} width="36" height={h} rx="14" fill="#fff" />
      <rect x="104" y={104 - h / 2} width="36" height={h} rx="14" fill="#fff" />
      <circle cx={78 + dx} cy={106 + dy} r={pupil} fill="#1f1b3a" />
      <circle cx={122 + dx} cy={106 + dy} r={pupil} fill="#1f1b3a" />
      <circle cx={81 + dx} cy={102 + dy} r="3" fill="#fff" />
      <circle cx={125 + dx} cy={102 + dy} r="3" fill="#fff" />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  const stroke = { fill: "none", stroke: "#1f1b3a", strokeWidth: 6, strokeLinecap: "round" as const };
  switch (mood) {
    case "happy":
    case "proud":
      return <path d="M82 138 Q100 158 118 138" {...stroke} />;
    case "wow":
      return <rect x="86" y="136" width="28" height="22" rx="11" fill="#1f1b3a" />;
    case "shocked":
      return <ellipse cx="100" cy="146" rx="11" ry="14" fill="#1f1b3a" />;
    case "worried":
      return <path d="M84 148 Q92 140 100 148 Q108 156 116 148" {...stroke} />;
    case "oops":
      return <path d="M88 148 Q100 140 112 148" {...stroke} />;
    case "thinking":
      return <path d="M88 145 L112 145" {...stroke} />;
    default:
      return <path d="M88 140 Q100 150 112 140" {...stroke} />;
  }
}

export default function Mascot({ mood = "idle", size = 140 }: Props) {
  return (
    <svg className={`mascot mascot-${mood}`} width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Blokje">
      <defs>
        <linearGradient id="mascot-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d6bff" />
          <stop offset="1" stopColor="#5b3df0" />
        </linearGradient>
      </defs>
      <ellipse className="mascot-shadow" cx="100" cy="188" rx="58" ry="8" fill="#1f1b3a" opacity="0.15" />
      <g className="mascot-body">
        {/* rook-style battlements */}
        <rect x="36" y="22" width="30" height="44" rx="12" fill="#6a49f5" />
        <rect x="85" y="14" width="30" height="52" rx="12" fill="#7a5bff" />
        <rect x="134" y="22" width="30" height="44" rx="12" fill="#6a49f5" />
        {/* feet and arms */}
        <rect x="52" y="160" width="32" height="26" rx="12" fill="#4a2fd0" />
        <rect x="116" y="160" width="32" height="26" rx="12" fill="#4a2fd0" />
        <rect className="mascot-arm-l" x="14" y="104" width="30" height="42" rx="14" fill="#6a49f5" />
        <rect className="mascot-arm-r" x="156" y="104" width="30" height="42" rx="14" fill="#6a49f5" />
        {/* body */}
        <rect x="28" y="48" width="144" height="124" rx="46" fill="url(#mascot-body)" />
        <rect x="44" y="140" width="112" height="22" rx="11" fill="#fff" opacity="0.12" />
        {/* cheeks */}
        <rect x="44" y="124" width="20" height="12" rx="6" fill="#ff8fa3" opacity="0.8" />
        <rect x="136" y="124" width="20" height="12" rx="6" fill="#ff8fa3" opacity="0.8" />
        <Eyes mood={mood} />
        {mood === "worried" && <path d="M54 76 L88 84 M146 76 L112 84" stroke="#1f1b3a" strokeWidth="6" strokeLinecap="round" />}
        {mood === "thinking" && <path d="M108 78 L142 72" stroke="#1f1b3a" strokeWidth="6" strokeLinecap="round" />}
        {mood === "shocked" && <path d="M164 70 Q170 84 164 90 Q158 84 164 70Z" fill="#7fd6ff" />}
        <Mouth mood={mood} />
      </g>
    </svg>
  );
}
