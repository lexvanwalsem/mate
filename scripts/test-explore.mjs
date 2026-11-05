// End-to-end check of the analysis board: drag a piece to start your own line, see it judged by the engine, undo.
// Usage: node scripts/test-explore.mjs <path-to-chrome-or-edge> dist
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [browser, dist] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-explore-"));
const port = 9366;
const proc = spawn(browser, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--enable-unsafe-extension-debugging", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).json();

const PGN = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0";
let failed = 0;
const expect = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${detail}`);
  if (!ok) failed++;
};

try {
  for (let i = 0; i < 40; i++) { try { await getJson("/json/version"); break; } catch { await sleep(300); } }
  const ver = await getJson("/json/version");
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => (bws.onopen = r));
  const loaded = await new Promise((res) => { bws.onmessage = (m) => res(JSON.parse(m.data)); bws.send(JSON.stringify({ id: 1, method: "Extensions.loadUnpacked", params: { path: dist } })); });
  const id = loaded.result.id;
  const page = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`chrome-extension://${id}/index.html#pgn=${encodeURIComponent(PGN)}&side=white`)}`, { method: "PUT" })).json();
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let n = 0;
  const send = (method, params = {}) => new Promise((res) => {
    const myId = ++n;
    const on = (m) => { const d = JSON.parse(m.data); if (d.id === myId) { ws.removeEventListener("message", on); res(d); } };
    ws.addEventListener("message", on);
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
  const ev = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });

  for (let i = 0; i < 120; i++) { if (await ev(`!!document.querySelector(".summary")`)) break; await sleep(1000); }
  await ev(`[...document.querySelectorAll("button")].find(b => b.innerText.includes("Start review")).click()`);
  await sleep(500);

  const square = async (file, rank) => {
    const r = JSON.parse(await ev(`JSON.stringify(document.querySelector(".board").getBoundingClientRect())`));
    return { x: r.left + ((file + 0.5) / 8) * r.width, y: r.top + ((8 - rank + 0.5) / 8) * r.height };
  };
  const mouse = (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });

  // Drag d2 -> d4 (the game continued with e4, so this starts a variation).
  const from = await square(3, 2);
  const to = await square(3, 4);
  await mouse("mousePressed", from.x, from.y);
  for (let s = 1; s <= 8; s++) await mouse("mouseMoved", from.x + ((to.x - from.x) * s) / 8, from.y + ((to.y - from.y) * s) / 8);
  const during = await ev(`!!document.querySelector(".drag-ghost")`);
  await mouse("mouseReleased", to.x, to.y);
  await sleep(300);
  expect("a ghost piece follows the pointer while dragging", during === true);
  const hasLine = await ev(`document.querySelector(".var-line")?.textContent ?? ""`);
  expect("your own line is shown", /1\. d4/.test(hasLine), JSON.stringify(hasLine));
  expect("coach offers undo and back to game", await ev(`[...document.querySelectorAll(".bubble button")].map(b => b.innerText).join("|")`) !== "");

  // The engine judges the move (a label shows up once it is evaluated).
  let label = "";
  for (let i = 0; i < 40; i++) { label = await ev(`document.querySelector(".bubble-title")?.innerText ?? ""`); if (label && !/own line|eigen lijn/i.test(label)) break; await sleep(500); }
  expect("engine gives the move a verdict", label && !/own line|eigen lijn/i.test(label), JSON.stringify(label));
  expect("best lines are shown for the new position", (await ev(`document.querySelectorAll(".lines .line").length`)) >= 1);

  // Click-to-move continues the line: black plays d5.
  const d7 = await square(3, 7);
  const d5 = await square(3, 5);
  await mouse("mousePressed", d7.x, d7.y);
  await mouse("mouseReleased", d7.x, d7.y);
  await sleep(150);
  const targetsShown = await ev(`document.querySelectorAll(".target").length`);
  await mouse("mousePressed", d5.x, d5.y);
  await mouse("mouseReleased", d5.x, d5.y);
  await sleep(300);
  const line2 = await ev(`document.querySelector(".var-line")?.textContent ?? ""`);
  expect("click-to-move shows legal targets", targetsShown >= 2, String(targetsShown));
  expect("the line continues with the clicked move", /d4 d5/.test(line2), JSON.stringify(line2));

  // Undo twice leaves the variation.
  const clickText = (text) => ev(`(() => { const b = [...document.querySelectorAll(".bubble button")].find(x => x.innerText.trim() === ${JSON.stringify(text)}); if (b) b.click(); return !!b; })()`);
  const undoLabel = (await ev(`document.documentElement.lang`)) ? "Undo" : "Undo";
  await clickText(undoLabel);
  await sleep(200);
  expect("undo removes the last move", /1\. d4$/.test(await ev(`document.querySelector(".var-line")?.textContent ?? ""`)));
  await clickText("Back to game");
  await sleep(200);
  expect("back to game leaves the variation", (await ev(`!!document.querySelector(".var-line")`)) === false);
} finally {
  proc.kill();
}
process.exitCode = failed ? 1 : 0;
console.log(failed ? `${failed} checks failed` : "all checks passed");
