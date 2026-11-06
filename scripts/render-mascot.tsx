// Renders every Blokje mood at a few moments of its animation into one HTML sheet for a visual check.
// Usage: npx tsx scripts/render-mascot.tsx <out.html>
import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import Mascot from "../src/ui/Mascot";

const moods = ["idle", "happy", "wow", "thinking", "worried", "oops", "shocked", "proud", "cheer", "sleepy"] as const;
const times = [0, 0.3, 0.65, 1.2];
const css = readFileSync("src/mascot.css", "utf8") + readFileSync("src/styles.css", "utf8").match(/:root \{ --m-top[^}]*\}/)![0];
const rows = times
  .map((t) => `<div class="row" style="--t:-${t}s">${moods.map((m) => `<div class="cell">${renderToStaticMarkup(createElement(Mascot, { mood: m, size: 120 }))}<small>${m} ${t}s</small></div>`).join("")}</div>`)
  .join("");
writeFileSync(
  process.argv[2],
  `<!doctype html><style>${css} body{margin:0;background:#f4f0ff;font:11px sans-serif} .row{display:flex} .cell{width:130px;text-align:center}
  .row .mascot, .row .mascot *{animation-delay:var(--t)!important;animation-play-state:paused!important}</style><body>${rows}</body>`,
);
