// Draws the "Blokje" piece set in the mascot's own style: one soft shape per piece on his flared base,
// gradient body, gloss, his eyes and cheeks. The rook is Blokje himself. Writes public/pieces/blokje/*.svg
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const INK = "#1f1b3a";
const SIDES = {
  w: { top: "#ffffff", bottom: "#ddd3fa", edge: "#7a66d4", gloss: 0.6, eyeWhite: false },
  b: { top: "#8263ff", bottom: "#3a24b4", edge: "#1d1458", gloss: 0.34, eyeWhite: true },
};

// Blokje's tower, shared with the app (src/ui/blokjeShape.ts).
const src = readFileSync("src/ui/blokjeShape.ts", "utf8");
const TOWER = [...src.matchAll(/"([^"]+)"/g)].map((m) => m[1]).join("");

// Body from `top` down, half width `w`, ending in the same flared base as Blokje.
const body = (w, top) =>
  `<path d="M${100 - w} ${top + 12} Q${100 - w} ${top} ${100 - w + 12} ${top} H${100 + w - 12} Q${100 + w} ${top} ${100 + w} ${top + 12} V136 C${100 + w} 152 168 154 168 170 V174 Q168 186 156 186 H44 Q32 186 32 174 V170 C32 154 ${100 - w} 152 ${100 - w} 136Z"/>`;
const foot = `<path d="M60 146 C56 158 32 158 32 170 V174 Q32 186 44 186 H156 Q168 186 168 174 V170 C168 158 144 158 140 146Z"/>`;

// Shapes in a 200x200 box; overlapping parts share one fill and one soft edge.
const SHAPES = {
  p: `${body(30, 104)}<circle cx="100" cy="82" r="36"/>`,
  r: `<path d="${TOWER}"/>`,
  n: `${foot}<path d="M52 160 C56 132 72 116 80 96 C64 104 48 120 32 116 C16 112 16 92 24 84 C36 72 52 60 64 44 C72 32 80 28 88 24 L96 6 L112 22 C140 32 160 76 156 116 C155 136 152 148 150 160Z"/>`,
  b: `${body(36, 104)}<circle cx="100" cy="20" r="11"/><ellipse cx="100" cy="74" rx="40" ry="48"/>`,
  q: `${body(42, 84)}<circle cx="56" cy="44" r="15"/><circle cx="100" cy="30" r="16"/><circle cx="144" cy="44" r="15"/><path d="M50 52 Q100 72 150 52 L142 96 H58Z"/>`,
  k: `${body(42, 84)}<rect x="89" y="6" width="22" height="58" rx="11"/><rect x="70" y="20" width="60" height="22" rx="11"/><rect x="54" y="56" width="92" height="44" rx="22"/>`,
};

// Blokje's eye: a white block with a pupil on the dark side, a plain dark block on the white side.
const eye = (s, x, y) =>
  s.eyeWhite
    ? `<rect x="${x - 10}" y="${y - 13}" width="20" height="26" rx="9" fill="#fff"/><circle cx="${x}" cy="${y + 2}" r="6.5" fill="${INK}"/><circle cx="${x + 2.5}" cy="${y - 1}" r="2.2" fill="#fff"/>`
    : `<rect x="${x - 7}" y="${y - 9}" width="14" height="18" rx="7" fill="${INK}"/><circle cx="${x + 2}" cy="${y - 3}" r="2.6" fill="#fff"/>`;
const cheek = (x, y) => `<rect x="${x - 7}" y="${y}" width="14" height="8" rx="4" fill="#ff8fa3" opacity="0.8"/>`;
const smile = (y) => `<path d="M90 ${y} Q100 ${y + 8} 110 ${y}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
const face = (s, y, gap) => `${eye(s, 100 - gap, y)}${eye(s, 100 + gap, y)}${cheek(100 - gap - 13, y + 16)}${cheek(100 + gap + 13, y + 16)}${smile(y + 22)}`;

const FACES = {
  p: (s) => face(s, 80, 15),
  r: (s) => face(s, 104, 18),
  n: (s) => `${eye(s, 72, 62)}<ellipse cx="30" cy="96" rx="4" ry="5" fill="${INK}"/>${cheek(88, 88)}`,
  b: (s) => face(s, 76, 15),
  q: (s) => face(s, 112, 18),
  k: (s) => face(s, 116, 18),
};

function piece(color, type) {
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
  ${FACES[type](s)}
</svg>
`;
}

mkdirSync("public/pieces/blokje", { recursive: true });
for (const color of ["w", "b"]) {
  for (const type of ["p", "n", "b", "r", "q", "k"]) {
    writeFileSync(`public/pieces/blokje/${color}${type.toUpperCase()}.svg`, piece(color, type));
  }
}
console.log("blokje pieces written");
