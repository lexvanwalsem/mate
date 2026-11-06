// Checks the latest games for your names on the home screen (needs internet) and that one click analyzes one.
// Usage: node scripts/test-online.mjs <path-to-chrome-or-edge> <absolute-path-to-dist> [screenshot-folder]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Chess } from "chess.js";

const [browser, dist, shots] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-puzzle-"));
const port = 9415;
const proc = spawn(browser, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--enable-unsafe-extension-debugging", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).json();

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
  const page = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`chrome-extension://${id}/index.html`)}`, { method: "PUT" })).json();
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
  const shot = async (name) => { if (shots) writeFileSync(path.join(shots, `${name}.png`), Buffer.from((await send("Page.captureScreenshot")).result.data, "base64")); };
  await send("Runtime.enable");
  // lichess blocks the headless user agent; a normal Chrome is what people use
  const ua = (await getJson("/json/version"))["User-Agent"].replace("HeadlessChrome", "Chrome");
  await send("Network.setUserAgentOverride", { userAgent: ua });
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await sleep(1500);
  await ev(`localStorage.setItem("zetje-settings", JSON.stringify({ lang: "en" })); location.reload()`);
  await sleep(1500);

  await ev('localStorage.setItem("zetje-settings", JSON.stringify({ lang: "en", usernames: "DrNykterstein, Hikaru" })); location.reload()');
  for (let i = 0; i < 60; i++) { if (await ev('document.querySelectorAll(".online-game").length > 0')) break; await sleep(250); }
  const rows = await ev('[...document.querySelectorAll(".online-game")].map((b) => b.innerText.split("\\n").join(" "))');
  expect("your latest games show up, from both sites", rows.length > 1 && rows.some((r) => r.includes("lichess")) && rows.some((r) => r.includes("chess.com")), JSON.stringify(rows.slice(0, 3)));
  expect("the field says where the names were found", /DrNykterstein found on lichess/.test(await ev('document.querySelector(".field-note").innerText')), await ev('document.querySelector(".field-note").innerText'));
  const fit = await ev('document.documentElement.scrollHeight - innerHeight');
  expect("the home screen still fits", fit <= 0, String(fit));
  if (shots) writeFileSync(path.join(shots, "home-online.png"), Buffer.from((await send("Page.captureScreenshot")).result.data, "base64"));
  await ev('document.querySelector(".online-game").click()');
  for (let i = 0; i < 120; i++) { if (await ev('!!document.querySelector(".summary")')) break; await sleep(1000); }
  expect("one click analyzes the game, from your side", await ev('!!document.querySelector(".hero .player-bar.you")'));
} finally {
  proc.kill();
}
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exit(failed ? 1 : 0);
