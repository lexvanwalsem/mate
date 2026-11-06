// Checks the header menu for pieces and board: it opens on the review screen and switches the board at once.
// Usage: node scripts/test-style.mjs <path-to-chrome-or-edge> <absolute-path-to-dist> [screenshot.png]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [browser, dist, shot] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-style-"));
const port = 9412;
const proc = spawn(browser, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--enable-unsafe-extension-debugging", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).json();
const PGN = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Bxc3 9. d5 Bf6 10. Re1 Ne7 11. Rxe4 d6 *";

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
  await ev(`[...document.querySelectorAll("button")].find((b) => b.innerText.includes("Start review")).click()`);
  await sleep(600);
  // 6. ...Bb4+ (index 11): the white king is in check and pulls a shocked face.
  await ev(`document.querySelectorAll(".move")[11].click()`);
  await sleep(400);
  const faces = `[...document.querySelectorAll(".board .piece img")].map((i) => i.getAttribute("src")).filter((s) => s.includes("-"))`;
  const inCheck = await ev(faces);
  expect("a king in check looks shocked", inCheck.includes("pieces/blokje/wK-shocked.svg"), JSON.stringify(inCheck));
  await ev(`document.querySelector(".style-btn").click()`);
  await sleep(200);
  await ev(`document.querySelector(".style-pop .switch-row input").click()`);
  await sleep(300);
  expect("reactions can be switched off", (await ev(faces)).length === 0);
  await ev(`document.querySelector(".style-pop .switch-row input").click()`);
  await ev(`document.querySelector(".style-btn").click()`);
  await sleep(200);
  const src = `document.querySelector(".board img")?.getAttribute("src") ?? ""`;
  const before = await ev(src);
  await ev(`document.querySelector(".style-btn").click()`);
  await sleep(300);
  expect("the style menu opens in the header", await ev(`!!document.querySelector(".style-pop")`));
  await ev(`[...document.querySelectorAll(".style-pop .piece-opt")].find((b) => b.innerText.includes("Merida")).click()`);
  await sleep(300);
  const after = await ev(src);
  expect("the board switches piece set at once", before.includes("blokje") && after.includes("merida"), `${before} -> ${after}`);
  await ev(`document.querySelectorAll(".style-pop .board-opt")[3].click()`);
  await sleep(200);
  const light = await ev(`getComputedStyle(document.documentElement).getPropertyValue("--sq-light").trim()`);
  expect("board colors switch too", light === "#f0d9b5", light);
  const rect = JSON.parse(await ev(`JSON.stringify(document.querySelector(".style-pop").getBoundingClientRect())`));
  expect("the menu stays on screen", rect.left >= 0 && rect.right <= 1366 && rect.bottom <= 768, JSON.stringify({ left: rect.left, right: rect.right, bottom: rect.bottom }));
  if (shot) writeFileSync(shot, Buffer.from((await send("Page.captureScreenshot")).result.data, "base64"));
} finally {
  proc.kill();
}
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exit(failed ? 1 : 0);
