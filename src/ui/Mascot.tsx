import { useEffect, useId, useRef, useState } from "react";
import { Mood } from "./classes";
import { BLOKJE_BODY } from "./blokjeShape";

interface Props {
  mood?: Mood;
  size?: number;
}

const INK = "#1f1b3a";

const Star = ({ cx, cy }: { cx: number; cy: number }) => (
  <g transform={`translate(${cx} ${cy})`}>
  <polygon
    className="m-star"
    points="0,-15 4.5,-5 15,-4.5 7,3 9,14 0,8 -9,14 -7,3 -15,-4.5 -4.5,-5"
    fill="#ffd23f"
    stroke="#c98a00"
    strokeWidth="2"
    strokeLinejoin="round"
  />
  </g>
);

/** Eyes: white blocks; the pupils follow the mouse but are clipped to the eye, so they never leave it. */
function Eyes({ mood }: { mood: Mood }) {
  const id = useId().replace(/:/g, "");
  if (mood === "wow") {
    return (
      <g>
        <Star cx={82} cy={104} />
        <Star cx={118} cy={104} />
      </g>
    );
  }
  if (mood === "proud" || mood === "cheer") {
    return (
      <g fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round">
        <path d="M70 108 Q82 94 94 108" />
        <path d="M106 108 Q118 94 130 108" />
      </g>
    );
  }
  if (mood === "sleepy") {
    return (
      <g fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round">
        <path d="M70 108 Q82 114 94 108" />
        <path d="M106 108 Q118 114 130 108" />
      </g>
    );
  }
  const big = mood === "shocked";
  const look: Partial<Record<Mood, [number, number]>> = { thinking: [5, -5], oops: [0, 3], worried: [0, 2] };
  const [dx, dy] = look[mood] ?? [0, 0];
  const h = big ? 40 : 34;
  const pupil = big ? 6 : 9;
  return (
    <g className="m-eyes">
      {[82, 118].map((cx) => (
        <g key={cx} className="m-eye">
          <clipPath id={`${id}-${cx}`}>
            <rect x={cx - 14} y={104 - h / 2} width="28" height={h} rx="13" />
          </clipPath>
          <rect x={cx - 14} y={104 - h / 2} width="28" height={h} rx="13" fill="#fff" />
          <g clipPath={`url(#${id}-${cx})`}>
          <g className="m-pupil">
            <circle cx={cx + dx} cy={106 + dy} r={pupil} fill={INK} />
            <circle cx={cx + 3 + dx} cy={102 + dy} r="2.8" fill="#fff" />
          </g>
          </g>
        </g>
      ))}
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
  const [fun, setFun] = useState<"" | "wink" | "blink" | "hop">("");
  const ref = useRef<SVGSVGElement>(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  // The pupils follow the mouse (the CSS reads --px and --py).
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    let frame = 0;
    let mx = 0;
    let my = 0;
    const apply = () => {
      frame = 0;
      const r = svg.getBoundingClientRect();
      const dx = mx - (r.left + r.width * 0.5);
      const dy = my - (r.top + r.height * 0.53);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 260);
      svg.style.setProperty("--px", `${(dx / dist) * reach * 5}px`);
      svg.style.setProperty("--py", `${(dy / dist) * reach * 6}px`);
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Every 7 to 14 seconds a calm Blokje winks or hops.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (["idle", "happy", "thinking", "proud"].includes(moodRef.current)) {
          const r = Math.random();
          setFun(r < 0.35 ? "wink" : r < 0.7 ? "blink" : "hop");
          window.setTimeout(() => setFun(""), 900);
        }
        schedule();
      }, 7000 + Math.random() * 7000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <svg ref={ref} className={`mascot mascot-${mood} ${hop ? "hop" : ""} ${fun ? `fun-${fun}` : ""}`} key={hop} onClick={() => setHop(hop + 1)} width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Blokje">
      <defs>
        <linearGradient id="mascot-body" gradientUnits="userSpaceOnUse" x1="0" y1="26" x2="0" y2="186">
          <stop offset="0" style={{ stopColor: "var(--m-top)" }} />
          <stop offset="1" style={{ stopColor: "var(--m-bottom)" }} />
        </linearGradient>
        <radialGradient id="mascot-gloss" cx="0.3" cy="0.22" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mascot-shade" gradientUnits="userSpaceOnUse" x1="0" y1="138" x2="0" y2="186">
          <stop offset="0" stopColor="#1f1b3a" stopOpacity="0" />
          <stop offset="1" stopColor="#1f1b3a" stopOpacity="0.16" />
        </linearGradient>
        <clipPath id="mascot-clip">
          <path d={BLOKJE_BODY} />
        </clipPath>
      </defs>
      <ellipse className="m-shadow" cx="100" cy="191" rx="62" ry="7" fill={INK} opacity="0.13" />
      <g className="m-root">
        <rect className="m-arm m-arm-l" x="38" y="94" width="24" height="38" rx="12" fill="url(#mascot-body)" />
        <rect className="m-arm m-arm-r" x="138" y="94" width="24" height="38" rx="12" fill="url(#mascot-body)" />
        <g className="m-body">
          <path d={BLOKJE_BODY} fill="url(#mascot-body)" />
          <g clipPath="url(#mascot-clip)">
            <rect x="0" y="0" width="200" height="200" fill="url(#mascot-gloss)" />
            <rect x="0" y="138" width="200" height="62" fill="url(#mascot-shade)" />
          </g>
          <rect className="m-cheek" x="56" y="122" width="16" height="10" rx="5" fill="#ff8fa3" opacity="0.8" />
          <rect className="m-cheek" x="128" y="122" width="16" height="10" rx="5" fill="#ff8fa3" opacity="0.8" />
          <g className="m-face">
            <Eyes mood={mood} />
            {mood === "worried" && <path d="M66 80 L92 86 M134 80 L108 86" stroke={INK} strokeWidth="5" strokeLinecap="round" />}
            {mood === "thinking" && (
              <g className="m-brow" stroke={INK} strokeWidth="5" strokeLinecap="round">
                <path d="M70 84 L94 84" />
                <path d="M106 80 L130 72" />
              </g>
            )}
            <g className="m-mouth">
              <g transform="translate(0 -8)">
                <Mouth mood={mood} />
              </g>
            </g>
          </g>
          {mood === "shocked" && <path className="m-drop" d="M150 52 Q156 66 150 72 Q144 66 150 52Z" fill="#7fd6ff" />}
        </g>
        {mood === "sleepy" && (
          <text className="m-zzz" x="160" y="34" fontSize="26" fontWeight="700" fill="#7a76a0">
            z
          </text>
        )}
      </g>
    </svg>
  );
}
