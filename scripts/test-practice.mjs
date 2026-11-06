// End-to-end check of the practice buttons: an opponent slip becomes a 'punish it' exercise in the review.
// Usage: node scripts/test-explore.mjs <path-to-chrome-or-edge> dist
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [browser, dist] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-explore-"));
const port = 9377;
const proc = spawn(browser, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--enable-unsafe-extension-debugging", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).json();

const PGN = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke6 8. Nc3 Ncb4 9. O-O c6 10. d4 Kd6 1-0";
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

  const clickMove = (n) => ev(`document.querySelectorAll(".move")[${n}].click()`);
  const bubble = () => ev(`document.querySelector(".bubble")?.innerText ?? ""`);
  const square = async (file, rank) => {
    const r = JSON.parse(await ev(`JSON.stringify(document.querySelector(".board").getBoundingClientRect())`));
    return { x: r.left + ((file + 0.5) / 8) * r.width, y: r.top + ((8 - rank + 0.5) / 8) * r.height };
  };
  const click = async (file, rank) => {
    const p = await square(file, rank);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(150);
  };

  // Move 5...Nxd5 (index 9) is the opponent's slip, White (you) can win material with Nxf7.
  let found = "";
  for (const idx of [9, 8, 10]) {
    await clickMove(idx);
    await sleep(250);
    found = await bubble();
    if (/Punish it/.test(found)) break;
  }
  expect("an opponent slip offers a punish exercise", /Punish it/.test(found), JSON.stringify(found.slice(0, 80)));
  await ev(`[...document.querySelectorAll(".bubble button")].find(b => b.innerText.trim() === "Punish it")?.click()`);
  await sleep(250);
  expect("the exercise asks for the punishing move", /slipped|punishes/i.test(await bubble()));
  // Wrong try first: a quiet pawn move.
  await click(0, 2);
  await click(0, 3);
  const arrowCount = () => ev(`document.querySelectorAll(".arrows .arrow").length`);
  expect("your wrong move is drawn as an arrow at once", (await arrowCount()) >= 1, String(await arrowCount()));
  let why = "";
  for (let i = 0; i < 60; i++) { why = await bubble(); if (!/Checking/.test(why)) break; await sleep(500); }
  expect("the wrong try is explained", /loses|gives away|not the best|allows mate/i.test(why), JSON.stringify(why.slice(0, 90)));
  expect("the engine reply is drawn too", (await arrowCount()) >= 2, String(await arrowCount()));
  expect("the dangerous square is marked", (await ev(`document.querySelectorAll(".mark").length`)) >= 1);
  await ev(`[...document.querySelectorAll(".bubble button")].find(b => b.innerText.trim() === "Once more")?.click()`);
  await sleep(200);
  await click(6, 5); // g5 knight
  await click(5, 7); // takes f7
  const verdict = await bubble();
  expect("the punishing move is accepted", /strong move/i.test(verdict), JSON.stringify(verdict.slice(0, 60)));

  // Walkthrough: plays through the key moments by itself.
  await ev(`document.querySelectorAll(".controls button")[4].click()`);
  await sleep(900);
  const first = await bubble();
  const m = first.match(/Key moment (\d+) of (\d+)/);
  expect("the walkthrough starts at a key moment", !!m, JSON.stringify(first.slice(0, 90)));
  if (m && Number(m[2]) > 1) {
    await sleep(6500);
    expect("and moves on to the next one by itself", /Key moment 2 of/.test(await bubble()));
  }
  await ev(`document.querySelectorAll(".controls button")[4].click()`);
  await sleep(300);
  expect("the walkthrough can be stopped", !/Key moment/.test(await bubble()));
} finally {
  proc.kill();
}
process.exitCode = failed ? 1 : 0;
console.log(failed ? `${failed} checks failed` : "all checks passed");
