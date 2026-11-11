// Checks how the review shows a move (headline, evaluation, Best and Next) and how a game ended:
// a crown on the winner, the reason on the loser's king, the coach and the move list.
// Usage: node scripts/test-ending.mjs <path-to-chrome-or-edge> <absolute-path-to-dist> [screenshot-folder]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [browser, dist, shots] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-end-"));
const port = 9417;
const proc = spawn(browser, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--enable-unsafe-extension-debugging", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).json();

const MATE = '[White "Lex"]\n[Black "Oscar"]\n[Result "1-0"]\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0';
const RESIGN = '[White "Lex"]\n[Black "Oscar"]\n[Result "0-1"]\n[Termination "Oscar won by resignation"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 0-1';

let failed = 0;
const expect = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${detail}`);
  if (!ok) failed++;
};

async function open(id, pgn) {
  const page = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`chrome-extension://${id}/index.html#pgn=${encodeURIComponent(pgn)}&side=white`)}`, { method: "PUT" })).json();
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
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await ev(`localStorage.setItem("zetje-settings", JSON.stringify({ lang: "en" }))`);
  for (let i = 0; i < 120; i++) { if (await ev(`!!document.querySelector(".summary")`)) break; await sleep(1000); }
  await ev(`[...document.querySelectorAll("button")].find((b) => b.innerText.includes("Start review")).click()`);
  await sleep(600);
  return { ev, shot };
}

try {
  for (let i = 0; i < 40; i++) { try { await getJson("/json/version"); break; } catch { await sleep(300); } }
  const ver = await getJson("/json/version");
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => (bws.onopen = r));
  const loaded = await new Promise((res) => { bws.onmessage = (m) => res(JSON.parse(m.data)); bws.send(JSON.stringify({ id: 1, method: "Extensions.loadUnpacked", params: { path: dist } })); });
  const id = loaded.result.id;

  // A game that ends in checkmate.
  const m = await open(id, MATE);
  await m.ev(`document.querySelectorAll(".move")[4].click()`); // 3. Qh5
  await sleep(500);
  const head = await m.ev(`document.querySelector(".headline")?.innerText ?? ""`);
  expect("a move gets a headline like 'Qh5 is ...'", /^Qh5 is /.test(head.trim()) || /Qh5 is/.test(head), JSON.stringify(head));
  expect("with the evaluation next to it", await m.ev(`!!document.querySelector(".headline .eval-pill")`));
  expect("Next is the main button", await m.ev(`!!document.querySelector(".coach-actions .next-btn")`));
  await m.shot("end-1-move");
  const said = await m.ev(`document.querySelector(".bubble p")?.innerText ?? ""`);
  expect("the coach talks to you about your own move and says what was better", /^You /.test(said) && /Better was/.test(said), JSON.stringify(said));
  expect("'The idea' is offered", await m.ev(`[...document.querySelectorAll(".coach-actions button")].some((b) => b.innerText === "The idea")`));
  await m.ev(`[...document.querySelectorAll(".coach-actions button")].find((b) => b.innerText === "The idea").click()`);
  await sleep(2100);
  const mid = await m.ev(`document.querySelector(".idea-line")?.innerText ?? ""`);
  expect("the idea plays the better move first, move by move", /Nf3/.test(mid) && mid.split(" ").length <= 4, JSON.stringify(mid));
  await m.shot("end-1b-idea");
  await sleep(4500);
  const full = await m.ev(`document.querySelector(".idea-line")?.innerText ?? ""`);
  expect("and keeps going a few moves to show why", full.split(" ").length > mid.split(" ").length, JSON.stringify(full));
  await m.ev(`[...document.querySelectorAll(".coach-actions button")].find((b) => b.innerText === "Back to the game").click()`);
  await sleep(400);
  expect("back to the game at the same move", /Qh5/.test(await m.ev(`document.querySelector(".move.current")?.innerText ?? ""`)));
  await m.ev(`document.querySelector(".coach-actions .next-btn").click()`);
  await sleep(400);
  expect("Next goes to the next move", /Nf6/.test(await m.ev(`document.querySelector(".move.current")?.innerText ?? ""`)));
  const theirs = await m.ev(`document.querySelector(".bubble p")?.innerText ?? ""`);
  expect("the opponent's move is told as 'Your opponent ...'", /^Your opponent /.test(theirs), JSON.stringify(theirs));
  expect("a blunder offers 'Why bad?'", await m.ev(`[...document.querySelectorAll(".coach-actions button")].some((b) => b.innerText === "Why bad?")`));
  await m.ev(`[...document.querySelectorAll(".controls button")].find((b) => b.innerText === "Flip board").click()`);
  await sleep(400);
  const flippedSaid = await m.ev(`document.querySelector(".bubble p")?.innerText ?? ""`);
  expect("after flipping the board the coach talks to the other player", /^You /.test(flippedSaid), JSON.stringify(flippedSaid));
  await m.ev(`[...document.querySelectorAll(".controls button")].find((b) => b.innerText === "Flip board").click()`);
  await sleep(300);
  await m.ev(`document.querySelectorAll(".move")[6].click()`); // 4. Qxf7#
  await sleep(700);
  const labels = await m.ev(`[...document.querySelectorAll(".callout-text")].map((e) => e.innerText)`);
  expect("the winner's king gets a crown and 'Winner'", labels.includes("Winner") && (await m.ev(`document.querySelectorAll(".callout-icon").length`)) === 2, JSON.stringify(labels));
  expect("the mated king says 'Checkmate'", labels.includes("Checkmate"));
  const endLine = await m.ev(`document.querySelector(".end-line")?.innerText ?? ""`);
  expect("the coach says it was checkmate and who won", /Checkmate! Lex wins\. You won!/.test(endLine), JSON.stringify(endLine));
  expect("the move list ends with the result and reason", /1-0\s*Checkmate/.test(await m.ev(`document.querySelector(".move-result")?.innerText ?? ""`)));
  expect("the captured pawn shows next to the winner", (await m.ev(`document.querySelectorAll(".player-bar .taken img").length`)) >= 1);
  await m.shot("end-2-mate");

  // A game that ends by resignation.
  const r = await open(id, RESIGN);
  await r.ev(`document.querySelectorAll(".move")[document.querySelectorAll(".move").length - 1].click()`);
  await sleep(700);
  const rl = await r.ev(`[...document.querySelectorAll(".callout-text")].map((e) => e.innerText)`);
  expect("a resignation is shown on the king", rl.includes("Resigned") && rl.includes("Winner"), JSON.stringify(rl));
  const rEnd = await r.ev(`document.querySelector(".end-line")?.innerText ?? ""`);
  expect("the coach says who resigned", /Lex resigned\. Oscar wins\./.test(rEnd), JSON.stringify(rEnd));
  await r.shot("end-3-resign");
} finally {
  proc.kill();
}
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exit(failed ? 1 : 0);
