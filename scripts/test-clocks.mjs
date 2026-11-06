// Clocks: analyzes a real Lichess game (needs internet) and checks time per move on the summary and clocks on the player bars.
// Usage: node scripts/test-explore.mjs <path-to-chrome-or-edge> dist
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [browser, dist] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-explore-"));
const port = 9411;
const proc = spawn(browser, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--enable-unsafe-extension-debugging", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).json();

const PGN = "";
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
  const page = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`chrome-extension://${id}/index.html#url=${encodeURIComponent("https://lichess.org/q7ZvsdUF")}&side=white`)}`, { method: "PUT" })).json();
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
  const card = await ev(`document.querySelector(".time-card")?.innerText ?? ""`);
  expect("the summary has a time card", /Time per move/.test(card), JSON.stringify(card.slice(0, 80)));
  // Export buttons: capture the file the page would download.
  await ev(`window.__blobs = []; const orig = URL.createObjectURL; URL.createObjectURL = (b) => { window.__blobs.push(b); return orig.call(URL, b); }; HTMLAnchorElement.prototype.click = function () {};`);
  await ev(`document.querySelector('.btn.icon[title^="Export"]').click()`);
  await sleep(300);
  const pgnInfo = await ev(`(async () => { const b = window.__blobs[0]; return b ? JSON.stringify({ size: b.size, annotated: (await b.text()).includes("[%eval") }) : "none"; })()`);
  expect("the annotated PGN export has notes", pgnInfo !== "none" && JSON.parse(pgnInfo).annotated && JSON.parse(pgnInfo).size > 500, pgnInfo);
  await ev(`document.querySelector('.btn.icon[title^="Save"]').click()`);
  let imgInfo = "none";
  for (let i = 0; i < 20 && imgInfo === "none"; i++) { await sleep(300); imgInfo = await ev(`(() => { const b = window.__blobs[1]; return b ? JSON.stringify({ size: b.size, type: b.type }) : "none"; })()`); }
  expect("the summary image is a PNG", imgInfo !== "none" && JSON.parse(imgInfo).type === "image/png" && JSON.parse(imgInfo).size > 5000, imgInfo);
  await ev(`[...document.querySelectorAll("button")].find(b => b.innerText.includes("Start review")).click()`);
  await sleep(500);
  await ev(`document.querySelectorAll(".move")[10].click()`);
  await sleep(300);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1300, y: 700 });
  await sleep(250);
  const px = await ev(`parseFloat(getComputedStyle(document.querySelector(".coach .mascot")).getPropertyValue("--px"))`);
  expect("the pupils follow the mouse", px > 1, String(px));
  expect("both player bars show a clock", (await ev(`document.querySelectorAll(".player-clock").length`)) === 2);
  expect("the coach says how long a move took", /spent on this move/.test(await ev(`document.querySelector(".bubble")?.innerText ?? ""`)));
} finally {
  proc.kill();
}
process.exitCode = failed ? 1 : 0;
console.log(failed ? `${failed} checks failed` : "all checks passed");
