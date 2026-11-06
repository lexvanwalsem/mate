// Writes the extension icons and favicon: Blokje's tower, white on a violet tile. Usage: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

// The same tower path the app uses (src/ui/blokjeShape.ts).
const src = readFileSync("src/ui/blokjeShape.ts", "utf8");
const body = [...src.matchAll(/"([^"]+)"/g)].map((m) => m[1]).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d6bff"/><stop offset="1" stop-color="#5b3df0"/></linearGradient>
    <linearGradient id="tw" x1="0" y1="26" x2="0" y2="186" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6ddff"/></linearGradient>
  </defs>
  <rect width="200" height="200" rx="46" fill="url(#bg)"/>
  <g transform="translate(100 104) scale(0.86) translate(-100 -106)">
    <path d="${body}" fill="url(#tw)"/>
    <rect x="68" y="88" width="28" height="34" rx="13" fill="#1f1b3a"/>
    <rect x="104" y="88" width="28" height="34" rx="13" fill="#1f1b3a"/>
    <circle cx="86" cy="99" r="5" fill="#fff"/>
    <circle cx="122" cy="99" r="5" fill="#fff"/>
    <path d="M88 140 Q100 150 112 140" fill="none" stroke="#1f1b3a" stroke-width="7" stroke-linecap="round"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/tower-${size}.png`);
}
console.log("icons written");
