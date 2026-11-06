// Draws the "Blokje" piece set: chunky rounded blocks in the mascot's style. Writes public/pieces/blokje/*.svg
import { mkdirSync, writeFileSync } from "node:fs";

const INK = "#1f1b3a";
const SIDES = {
  w: { top: "#fffdf6", bottom: "#e9ddc6", accent: "#8d6bff", eye: INK, pupil: null, gloss: 0.75, smile: INK },
  b: { top: "#6a5bd0", bottom: "#2a2270", accent: "#cbbfff", eye: "#ffffff", pupil: INK, gloss: 0.3, smile: "#ffffff" },
};

// One flowing silhouette per piece (100x100). Overlapping parts share one fill and one outline, so they read as a single block.
const base = `<rect x="16" y="78" width="68" height="13" rx="6.5"/>`;
const SHAPES = {
  p: `${base}<circle cx="50" cy="34" r="16"/><path d="M38 44 Q44 58 32 82 H68 Q56 58 62 44Z"/>`,
  r: `${base}<path d="M27 82 Q33 62 31 38 H69 Q67 62 73 82Z"/><rect x="22" y="14" width="15" height="28" rx="6"/><rect x="42.5" y="14" width="15" height="28" rx="6"/><rect x="63" y="14" width="15" height="28" rx="6"/>`,
  n: `${base}<path d="M26 82 C28 66 36 58 40 48 C32 52 24 60 16 58 C8 56 8 46 12 42 C18 36 26 30 32 22 C36 16 40 14 44 12 L48 3 L56 11 C70 16 80 38 78 58 C77 68 76 74 76 82Z"/>`,
  b: `${base}<circle cx="50" cy="9" r="5.5"/><ellipse cx="50" cy="26" rx="13" ry="18"/><path d="M37 36 Q41 54 24 82 H76 Q59 54 63 36Z"/>`,
  q: `${base}<circle cx="27" cy="22" r="7.5"/><circle cx="50" cy="15" r="8.5"/><circle cx="73" cy="22" r="7.5"/><path d="M24 26 Q50 32 76 26 L70 46 Q74 62 76 82 H24 Q26 62 30 46Z"/>`,
  k: `${base}<rect x="43" y="2" width="14" height="32" rx="7"/><rect x="31" y="9" width="38" height="15" rx="7.5"/><path d="M34 32 Q50 24 66 32 Q66 62 76 82 H24 Q34 62 34 34Z"/>`,
};

const eye = (s, x, y) =>
  s.pupil
    ? `<circle cx="${x}" cy="${y}" r="4.9" fill="${s.eye}"/><circle cx="${x}" cy="${y + 0.4}" r="2.9" fill="${s.pupil}"/><circle cx="${x + 1.1}" cy="${y - 1}" r="1" fill="#fff"/>`
    : `<circle cx="${x}" cy="${y}" r="4.6" fill="${s.eye}"/><circle cx="${x + 1.5}" cy="${y - 1.6}" r="1.5" fill="#fff"/>`;
const cheeks = (x1, x2, y) => `<ellipse cx="${x1}" cy="${y}" rx="4.4" ry="2.8" fill="#ff9bb0" opacity="0.75"/><ellipse cx="${x2}" cy="${y}" rx="4.4" ry="2.8" fill="#ff9bb0" opacity="0.75"/>`;
const smile = (s, y, w = 4.5) => `<path d="M${50 - w} ${y} Q50 ${y + 4} ${50 + w} ${y}" stroke="${s.smile}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
const face = (s, y, gap = 8) => `${eye(s, 50 - gap, y)}${eye(s, 50 + gap, y)}${cheeks(50 - gap - 6, 50 + gap + 6, y + 6)}${smile(s, y + 6)}`;

// Only a face: no bands, stripes or ornaments.
const DETAILS = {
  p: (s) => face(s, 33, 7),
  r: (s) => face(s, 55, 9),
  n: (s) => `${eye(s, 33, 36)}<ellipse cx="15" cy="49" rx="2.4" ry="3" fill="${INK}"/><ellipse cx="42" cy="46" rx="4.4" ry="2.8" fill="#ff9bb0" opacity="0.75"/>`,
  b: (s) => face(s, 56, 7),
  q: (s) => face(s, 60, 9),
  k: (s) => face(s, 58, 9),
};

function piece(color, type) {
  const s = SIDES[color];
  const id = `${color}${type}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <g id="s${id}">${SHAPES[type]}</g>
    <linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.top}"/><stop offset="1" stop-color="${s.bottom}"/></linearGradient>
    <clipPath id="c${id}"><use xlink:href="#s${id}"/></clipPath>
  </defs>
  <use xlink:href="#s${id}" fill="${INK}" stroke="${INK}" stroke-width="6.5" stroke-linejoin="round"/>
  <use xlink:href="#s${id}" fill="url(#g${id})"/>
  <g clip-path="url(#c${id})">
    <ellipse cx="36" cy="36" rx="16" ry="32" transform="rotate(-18 36 36)" fill="#fff" opacity="${s.gloss * 0.32}"/>
  </g>
  ${DETAILS[type](s)}
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
