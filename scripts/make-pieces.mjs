// Draws the "Blokje" piece set in the mascot's own style: one soft shape per piece on his flared base,
// gradient body, gloss, his eyes and cheeks. The rook is Blokje himself. Pawns stay plain.
// Writes public/pieces/blokje/<color><TYPE>.svg plus -happy, -worried and -shocked variants for the reactions (not for pawns).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const INK = "#12262e";
const SIDES = {
  w: { top: "#ffffff", bottom: "#d3ebec", edge: "#4c9aa3", gloss: 0.6, eyeWhite: false },
  b: { top: "#2bb8b6", bottom: "#0a6e72", edge: "#08343a", gloss: 0.34, eyeWhite: true },
};
const MOODS = ["idle", "happy", "worried", "shocked"];

// Blokje's tower, shared with the app (src/ui/blokjeShape.ts).
const src = readFileSync("src/ui/blokjeShape.ts", "utf8");
const TOWER = [...src.matchAll(/"([^"]+)"/g)].map((m) => m[1]).join("");

// Body from `top` down, half width `w`, ending in the same flared base as Blokje.
const body = (w, top) =>
  `<path d="M${100 - w} ${top + 12} Q${100 - w} ${top} ${100 - w + 12} ${top} H${100 + w - 12} Q${100 + w} ${top} ${100 + w} ${top + 12} V136 C${100 + w} 152 168 154 168 170 V174 Q168 186 156 186 H44 Q32 186 32 174 V170 C32 154 ${100 - w} 152 ${100 - w} 136Z"/>`;
const foot = `<path d="M60 146 C56 158 32 158 32 170 V174 Q32 186 44 186 H156 Q168 186 168 174 V170 C168 158 144 158 140 146Z"/>`;

// Shapes in a 200x200 box; overlapping parts share one fill and one soft edge.
const SHAPES = {
  // pawn: round head on a little collar, a waist that flows into a smaller base, so it reads smaller than the rest
  p: `<circle cx="100" cy="66" r="28"/><rect x="64" y="90" width="72" height="17" rx="8.5"/><path d="M80 102 H120 C120 124 128 140 140 150 C152 156 158 162 158 172 Q158 186 146 186 H54 Q42 186 42 172 C42 162 48 156 60 150 C72 140 80 124 80 102Z"/>`,
  r: `<path d="${TOWER}"/>`,
  n: `${foot}<path d="M52 160 C56 132 72 116 80 96 C64 104 48 120 32 116 C16 112 16 92 24 84 C36 72 52 60 64 44 C72 32 80 28 88 24 L96 6 L112 22 C140 32 160 76 156 116 C155 136 152 148 150 160Z"/>`,
  b: `${body(36, 104)}<circle cx="100" cy="20" r="11"/><ellipse cx="100" cy="74" rx="40" ry="48"/>`,
  q: `${body(42, 84)}<circle cx="56" cy="44" r="15"/><circle cx="100" cy="30" r="16"/><circle cx="144" cy="44" r="15"/><path d="M50 52 Q100 72 150 52 L142 96 H58Z"/>`,
  k: `${body(42, 84)}<rect x="89" y="6" width="22" height="58" rx="11"/><rect x="70" y="20" width="60" height="22" rx="11"/><rect x="54" y="56" width="92" height="44" rx="22"/>`,
};

// Where the face sits: eye height, half the distance between the eyes.
const FACE_AT = { r: [102, 18], b: [78, 15], q: [114, 19], k: [118, 19] };

// Blokje's eye. Dark side: a white block with a pupil. White side: a dark block with a shine.
// `look` moves the pupil, `big` makes the eye taller for a fright.
function eye(s, x, y, { look = [0, 0], big = false } = {}) {
  const [lx, ly] = look;
  if (s.eyeWhite) {
    const h = big ? 34 : 28;
    return `<rect x="${x - 11}" y="${y - h / 2}" width="22" height="${h}" rx="10" fill="#fff"/><circle cx="${x + lx}" cy="${y + 2 + ly}" r="${big ? 5 : 7}" fill="${INK}"/><circle cx="${x + 2.5 + lx}" cy="${y - 1 + ly}" r="2.2" fill="#fff"/>`;
  }
  const h = big ? 26 : 21;
  return `<rect x="${x - 8 + lx}" y="${y - h / 2 + ly}" width="16" height="${h}" rx="8" fill="${INK}"/><circle cx="${x + 2.5 + lx}" cy="${y - h / 2 + 6 + ly}" r="2.8" fill="#fff"/>`;
}
const arcEye = (x, y) => `<path d="M${x - 10} ${y + 4} Q${x} ${y - 10} ${x + 10} ${y + 4}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`;
const cheek = (x, y) => `<rect x="${x - 7}" y="${y}" width="14" height="8" rx="4" fill="#ff8fa3" opacity="0.8"/>`;
const line = (d, w = 5) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

function face(s, type, mood) {
  if (type === "n") return knightFace(s, mood);
  if (type === "p") return ""; // pawns stay plain
  const [y, gap] = FACE_AT[type];
  const l = 100 - gap;
  const r = 100 + gap;
  const cheeks = `${cheek(l - 12, y + 15)}${cheek(r + 12, y + 15)}`;
  const m = y + 22; // mouth height
  switch (mood) {
    case "happy":
      return `${arcEye(l, y)}${arcEye(r, y)}${cheeks}<path d="M87 ${m - 4} Q100 ${m + 18} 113 ${m - 4}Z" fill="${INK}"/>`;
    case "worried":
      return `${eye(s, l, y, { look: [-2, 3] })}${eye(s, r, y, { look: [-2, 3] })}${line(`M${l - 9} ${y - 15} L${l + 7} ${y - 21} M${r + 9} ${y - 15} L${r - 7} ${y - 21}`, 4.5)}${line(`M90 ${m + 2} Q95 ${m - 3} 100 ${m + 2} Q105 ${m + 7} 110 ${m + 2}`, 4.5)}`;
    case "shocked":
      return `${eye(s, l, y, { big: true })}${eye(s, r, y, { big: true })}<ellipse cx="100" cy="${m + 4}" rx="7" ry="9" fill="${INK}"/>`;
    default:
      return `${eye(s, l, y)}${eye(s, r, y)}${cheeks}${line(`M91 ${m} Q100 ${m + 7} 109 ${m}`)}`;
  }
}

function knightFace(s, mood) {
  const nostril = `<ellipse cx="30" cy="96" rx="4" ry="5" fill="${INK}"/>`;
  const blush = cheek(86, 86);
  switch (mood) {
    case "happy":
      return `${arcEye(72, 64)}${nostril}${blush}`;
    case "worried":
      return `${eye(s, 72, 62, { look: [-2, 3] })}${line("M62 48 L80 40", 4.5)}${nostril}`;
    case "shocked":
      return `${eye(s, 72, 62, { big: true })}${nostril}`;
    default:
      return `${eye(s, 72, 62)}${nostril}${blush}`;
  }
}

function piece(color, type, mood) {
  const s = SIDES[color];
  const id = `${color}${type}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 200 200" width="100" height="100">
  <defs>
    <g id="s${id}">${SHAPES[type]}</g>
    <linearGradient id="g${id}" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="186"><stop offset="0" stop-color="${s.top}"/><stop offset="1" stop-color="${s.bottom}"/></linearGradient>
    <radialGradient id="l${id}" cx="0.32" cy="0.2" r="0.62"><stop offset="0" stop-color="#fff" stop-opacity="${s.gloss}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="d${id}" gradientUnits="userSpaceOnUse" x1="0" y1="140" x2="0" y2="186"><stop offset="0" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity="0.16"/></linearGradient>
    <clipPath id="c${id}"><use xlink:href="#s${id}"/></clipPath>
  </defs>
  <use xlink:href="#s${id}" fill="${s.edge}" stroke="${s.edge}" stroke-width="7" stroke-linejoin="round"/>
  <use xlink:href="#s${id}" fill="url(#g${id})"/>
  <g clip-path="url(#c${id})"><rect width="200" height="200" fill="url(#l${id})"/><rect y="140" width="200" height="60" fill="url(#d${id})"/></g>
  ${face(s, type, mood)}
</svg>
`;
}

mkdirSync("public/pieces/blokje", { recursive: true });
for (const color of ["w", "b"]) {
  for (const type of ["p", "n", "b", "r", "q", "k"]) {
    for (const mood of type === "p" ? ["idle"] : MOODS) {
      const name = `${color}${type.toUpperCase()}${mood === "idle" ? "" : `-${mood}`}`;
      writeFileSync(`public/pieces/blokje/${name}.svg`, piece(color, type, mood));
    }
  }
}
console.log("blokje pieces written");
