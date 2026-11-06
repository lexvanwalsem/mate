// Draws the "Blokje" piece set: chunky rounded blocks in the mascot's style. Writes public/pieces/blokje/*.svg
import { mkdirSync, writeFileSync } from "node:fs";

const INK = "#1f1b3a";
const SIDES = {
  w: { top: "#fffdf6", bottom: "#e9ddc6", accent: "#8d6bff", eye: INK, pupil: null, gloss: 0.75, smile: INK },
  b: { top: "#6a5bd0", bottom: "#2a2270", accent: "#cbbfff", eye: "#ffffff", pupil: INK, gloss: 0.3, smile: "#ffffff" },
};

// Silhouettes in a 100x100 box, all standing on one rounded base.
const base = `<rect x="16" y="76" width="68" height="15" rx="7.5"/>`;
const SHAPES = {
  p: `${base}<rect x="33" y="46" width="34" height="36" rx="15"/><circle cx="50" cy="35" r="16"/>`,
  r: `${base}<rect x="25" y="34" width="50" height="46" rx="9"/><rect x="22" y="14" width="15" height="26" rx="5.5"/><rect x="42.5" y="14" width="15" height="26" rx="5.5"/><rect x="63" y="14" width="15" height="26" rx="5.5"/>`,
  n: `${base}<rect x="38" y="40" width="36" height="40" rx="14"/><circle cx="47" cy="33" r="18"/><rect x="11" y="34" width="36" height="25" rx="12.5"/><path d="M49 22 L55 9 Q57 6 60 9 L64 24Z"/><rect x="62" y="20" width="14" height="16" rx="7" transform="rotate(20 69 28)"/><rect x="66" y="34" width="14" height="16" rx="7"/><rect x="66" y="48" width="14" height="16" rx="7"/>`,
  b: `${base}<rect x="33" y="36" width="34" height="46" rx="17"/><circle cx="50" cy="25" r="12"/>`,
  q: `${base}<rect x="24" y="40" width="52" height="42" rx="15"/><circle cx="28" cy="27" r="8"/><circle cx="50" cy="20" r="9"/><circle cx="72" cy="27" r="8"/><rect x="26" y="30" width="48" height="14" rx="6"/>`,
  k: `${base}<rect x="27" y="40" width="46" height="42" rx="15"/><rect x="44.5" y="6" width="11" height="32" rx="4.5"/><rect x="35" y="14" width="30" height="11" rx="4.5"/>`,
};

const eye = (s, x, y) =>
  s.pupil
    ? `<circle cx="${x}" cy="${y}" r="4.9" fill="${s.eye}"/><circle cx="${x}" cy="${y + 0.4}" r="2.9" fill="${s.pupil}"/><circle cx="${x + 1.1}" cy="${y - 1}" r="1" fill="#fff"/>`
    : `<circle cx="${x}" cy="${y}" r="4.6" fill="${s.eye}"/><circle cx="${x + 1.5}" cy="${y - 1.6}" r="1.5" fill="#fff"/>`;
const cheeks = (x1, x2, y) => `<ellipse cx="${x1}" cy="${y}" rx="4.6" ry="3" fill="#ff9bb0" opacity="0.8"/><ellipse cx="${x2}" cy="${y}" rx="4.6" ry="3" fill="#ff9bb0" opacity="0.8"/>`;
const smile = (s, y, w = 5) => `<path d="M${50 - w} ${y} Q50 ${y + 4.5} ${50 + w} ${y}" stroke="${s.smile}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
const band = (s, x, y, w, h = 8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${s.accent}" stroke="${INK}" stroke-width="2.2"/>`;
const sparkle = (x, y) => `<path d="M${x} ${y - 5} L${x + 1.6} ${y - 1.6} L${x + 5} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 5} L${x - 1.6} ${y + 1.6} L${x - 5} ${y} L${x - 1.6} ${y - 1.6}Z" fill="#fff" opacity="0.9"/>`;

// Details drawn over the body (not clipped) so each piece has its own character.
const DETAILS = {
  p: (s) => `${band(s, 31, 46, 38)}${sparkle(42, 27)}${eye(s, 42, 64)}${eye(s, 58, 64)}${cheeks(35, 65, 70)}`,
  r: (s) =>
    `${band(s, 24, 36, 52, 8)}<path d="M31 60 H69 M38 60 V68 M56 60 V68" stroke="${INK}" stroke-width="1.8" opacity="0.22" fill="none"/>` +
    `<path d="M41 76 V69 a9 9 0 0 1 18 0 V76Z" fill="${INK}" opacity="0.3"/>${eye(s, 41, 52)}${eye(s, 59, 52)}${cheeks(34, 66, 58)}` +
    `<path d="M27 20 H33 M47.5 20 H53 M68 20 H73" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.6"/>`,
  n: (s) =>
    `<g fill="${s.accent}" stroke="${INK}" stroke-width="2.4"><rect x="62" y="20" width="14" height="16" rx="7" transform="rotate(20 69 28)"/><rect x="66" y="34" width="14" height="16" rx="7"/><rect x="66" y="48" width="14" height="16" rx="7"/></g>` +
    `<path d="M52 21 L56 12 L60 21Z" fill="${s.accent}" opacity="0.9"/>` +
    `<rect x="30" y="36" width="8" height="22" rx="4" fill="${s.accent}" stroke="${INK}" stroke-width="2.2"/>` +
    `${eye(s, 43, 29)}${sparkle(54, 41)}<ellipse cx="18" cy="42" rx="2.6" ry="3.4" fill="${INK}"/>` +
    `<path d="M18 52 Q23 56 28 52" stroke="${s.smile}" stroke-width="2.4" stroke-linecap="round" fill="none"/>` +
    `<ellipse cx="46" cy="47" rx="4.6" ry="3" fill="#ff9bb0" opacity="0.8"/>`,
  b: (s) =>
    `<path d="M42 17 L58 33" stroke="${s.pupil ? "#fff" : INK}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<circle cx="50" cy="11.5" r="4.4" fill="${s.accent}" stroke="${INK}" stroke-width="2.2"/>${band(s, 32, 45, 36)}` +
    `${eye(s, 43, 62)}${eye(s, 57, 62)}${cheeks(37, 63, 68)}${smile(s, 68, 4)}`,
  q: (s) =>
    `${band(s, 24, 38, 52, 7)}<circle cx="50" cy="46" r="0.1"/>` +
    `<circle cx="50" cy="30" r="4.2" fill="${s.accent}" stroke="${INK}" stroke-width="2"/>${sparkle(48, 16)}` +
    `${eye(s, 41, 62)}${eye(s, 59, 62)}${cheeks(34, 66, 68)}${smile(s, 68, 5)}`,
  k: (s) =>
    `${band(s, 27, 41, 46, 9)}<circle cx="50" cy="45.5" r="3" fill="#fff" opacity="0.9"/>` +
    `<path d="M47 11 V30" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity="0.55"/><circle cx="50" cy="19.5" r="3" fill="${s.accent}" stroke="${INK}" stroke-width="1.8"/>` +
    `${eye(s, 41, 64)}${eye(s, 59, 64)}${cheeks(34, 66, 70)}${smile(s, 69, 5)}`,
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
  <use xlink:href="#s${id}" fill="${INK}" stroke="${INK}" stroke-width="7.5" stroke-linejoin="round"/>
  <use xlink:href="#s${id}" fill="url(#g${id})"/>
  <g clip-path="url(#c${id})">
    <ellipse cx="36" cy="36" rx="16" ry="32" transform="rotate(-18 36 36)" fill="#fff" opacity="${s.gloss * 0.32}"/>
    <rect x="0" y="76" width="100" height="24" fill="${INK}" opacity="0.14"/>
    <rect x="62" y="0" width="38" height="100" fill="${INK}" opacity="0.07"/>
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
