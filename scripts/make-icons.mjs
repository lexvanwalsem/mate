// Writes the extension icons and favicon: Blokje himself, the violet tower, on a transparent background.
// Usage: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

// The same tower path the app uses (src/ui/blokjeShape.ts).
const src = readFileSync("src/ui/blokjeShape.ts", "utf8");
const body = [...src.matchAll(/"([^"]+)"/g)].map((m) => m[1]).join("");
const INK = "#1f1b3a";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="16 18 168 168">
  <defs>
    <linearGradient id="b" x1="0" y1="26" x2="0" y2="186" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8d6bff"/><stop offset="1" stop-color="#5b3df0"/></linearGradient>
    <radialGradient id="g" cx="0.3" cy="0.22" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <clipPath id="c"><path d="${body}"/></clipPath>
  </defs>
  <rect x="38" y="94" width="24" height="38" rx="12" fill="url(#b)"/>
  <rect x="138" y="94" width="24" height="38" rx="12" fill="url(#b)"/>
  <path d="${body}" fill="url(#b)"/>
  <rect x="0" y="0" width="200" height="200" fill="url(#g)" clip-path="url(#c)"/>
  <rect x="68" y="87" width="28" height="34" rx="13" fill="#fff"/>
  <rect x="104" y="87" width="28" height="34" rx="13" fill="#fff"/>
  <circle cx="82" cy="106" r="9" fill="${INK}"/>
  <circle cx="118" cy="106" r="9" fill="${INK}"/>
  <rect x="56" y="122" width="16" height="10" rx="5" fill="#ff8fa3" opacity="0.8"/>
  <rect x="128" y="122" width="16" height="10" rx="5" fill="#ff8fa3" opacity="0.8"/>
  <path d="M88 132 Q100 142 112 132" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
</svg>`;

mkdirSync("public/icons", { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toFile(`public/icons/blokje-${size}.png`);
}
console.log("icons written");
