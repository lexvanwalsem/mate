// Checks the Duolingo integration against a stand-in page: the browser answers requests to duolingo.com itself
// (CDP Fetch), so no login and no real Duolingo traffic. The page loads its match list like Duolingo does;
// our buttons must appear on the rows and a click must open the analysis with the right PGN and side.
// Usage: node scripts/test-duolingo.mjs <path-to-chrome-or-edge> <absolute-path-to-dist>
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [browser, dist] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-duo-"));
const port = 9416;
const proc = spawn(browser, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--enable-unsafe-extension-debugging", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).json();

let failed = 0;
const expect = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${detail}`);
  if (!ok) failed++;
};

const PAGE = `<!doctype html><html><body><h1>Chess matches</h1>
<div data-test="chess-match-history-row">Match vs Oscar</div>
<div data-test="chess-match-history-row">Match vs Bot</div>
<script>setTimeout(() => fetch("/chess/1/4242/matches?matchesLimit=20", { credentials: "include" }), 300);</script>
</body></html>`;
const LIST = { matchHistory: [{ matchId: "m1", opponentName: "Oscar" }, { matchId: "m2", opponentName: "" }] };
const MATCH = { match: { moveHistory: ["f2f3", "e7e5", "g2g4", "d8h4"], outcome: "black", playerColor: "black" } };

try {
  for (let i = 0; i < 40; i++) { try { await getJson("/json/version"); break; } catch { await sleep(300); } }
  const ver = await getJson("/json/version");
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => (bws.onopen = r));
  let bn = 0;
  const bsend = (method, params = {}) => new Promise((res) => {
    const myId = ++bn;
    const on = (m) => { const d = JSON.parse(m.data); if (d.id === myId) { bws.removeEventListener("message", on); res(d); } };
    bws.addEventListener("message", on);
    bws.send(JSON.stringify({ id: myId, method, params }));
  });
  await bsend("Extensions.loadUnpacked", { path: dist });

  const page = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let n = 0;
  const seen = [];
  const send = (method, params = {}) => new Promise((res) => {
    const myId = ++n;
    const on = (m) => { const d = JSON.parse(m.data); if (d.id === myId) { ws.removeEventListener("message", on); res(d); } };
    ws.addEventListener("message", on);
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
  // Answer every duolingo.com request ourselves.
  ws.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.method !== "Fetch.requestPaused") return;
    const url = d.params.request.url;
    seen.push(url);
    const json = (o) => ({ body: JSON.stringify(o), type: "application/json" });
    const r = /\/matches\/m\d/.test(url) ? json(MATCH) : /\/matches/.test(url) ? json(LIST) : { body: PAGE, type: "text/html" };
    send("Fetch.fulfillRequest", { requestId: d.params.requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: r.type }], body: Buffer.from(r.body).toString("base64") });
  });
  await send("Fetch.enable", { patterns: [{ urlPattern: "https://www.duolingo.com/*" }] });
  await send("Runtime.enable");
  const ev = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

  await send("Page.navigate", { url: "https://www.duolingo.com/chess-matches" });
  for (let i = 0; i < 30; i++) { if ((await ev(`document.querySelectorAll(".mate-analyze").length`)) === 2) break; await sleep(300); }
  expect("every match row gets an Analyze button", (await ev(`document.querySelectorAll(".mate-analyze").length`)) === 2);
  expect("the page's own match list request was picked up", seen.some((u) => /\/chess\/1\/4242\/matches\?/.test(u)));

  const before = (await getJson("/json/list")).length;
  await ev(`document.querySelector(".mate-analyze").click()`);
  let opened;
  for (let i = 0; i < 30 && !opened; i++) {
    await sleep(300);
    opened = (await getJson("/json/list")).find((t) => t.type === "page" && t.url.includes("index.html"));
  }
  expect("clicking fetches that match", seen.some((u) => u.endsWith("/chess/1/4242/matches/m1")));
  expect("a new tab opens with the analysis", !!opened && (await getJson("/json/list")).length > before);
  // The app reads and clears the # itself, so check what it shows: the analyzed game, from your side.
  let hero = "";
  if (opened) {
    const tws = new WebSocket(opened.webSocketDebuggerUrl);
    await new Promise((r) => (tws.onopen = r));
    let k = 0;
    const tev = (expression) => new Promise((res) => { const id = ++k; const on = (m) => { const d = JSON.parse(m.data); if (d.id === id) { tws.removeEventListener("message", on); res(d.result?.result?.value); } }; tws.addEventListener("message", on); tws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, returnByValue: true } })); });
    for (let i = 0; i < 60; i++) { if (await tev('!!document.querySelector(".summary")')) break; await sleep(1000); }
    hero = (await tev('document.querySelector(".hero")?.innerText ?? ""')) ?? "";
    const you = (await tev('document.querySelector(".hero .player-bar.you")?.innerText ?? ""')) ?? "";
    expect("the game is analyzed with the opponent's name", /Oscar/.test(hero), JSON.stringify(hero.slice(0, 120)));
    expect("you are analyzed from your own side (black)", /Duolingo player/.test(you) && (await tev('!!document.querySelector(".hero .player-bar.you .chip-color.black")')), JSON.stringify(you));
    tws.close();
  }
} finally {
  proc.kill();
}
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exit(failed ? 1 : 0);
