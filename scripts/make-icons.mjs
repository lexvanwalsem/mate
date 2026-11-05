import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="44" fill="#fff9ee"/>
  <rect x="36" y="22" width="30" height="44" rx="12" fill="#6a49f5"/>
  <rect x="85" y="14" width="30" height="52" rx="12" fill="#7a5bff"/>
  <rect x="134" y="22" width="30" height="44" rx="12" fill="#6a49f5"/>
  <rect x="28" y="48" width="144" height="124" rx="46" fill="#6c4cf5"/>
  <rect x="60" y="86" width="36" height="40" rx="14" fill="#fff"/>
  <rect x="104" y="86" width="36" height="40" rx="14" fill="#fff"/>
  <circle cx="78" cy="108" r="10" fill="#1f1b3a"/>
  <circle cx="122" cy="108" r="10" fill="#1f1b3a"/>
  <path d="M82 140 Q100 158 118 140" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
</svg>`;

mkdirSync("public/icons", { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
}
console.log("icons written");
