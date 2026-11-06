// End-to-end check of the puzzle flow with the Lichess daily puzzle (needs internet): the opponent move that opens
// the puzzle, a wrong try with a sign on the board, try again, the right move and the calm reply.
// Usage: node scripts/test-puzzle.mjs <path-to-chrome-or-edge> <absolute-path-to-dist> [screenshot-folder]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Chess } from "chess.js";

const [browser, dist, shots] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-puzzle-"));
const port = 9414;
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
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await sleep(1500);
  await ev(`localStorage.setItem("zetje-settings", JSON.stringify({ lang: "en" })); location.reload()`);
  await sleep(1500);

  const daily = await (await fetch("https://lichess.org/api/puzzle/daily")).json();
  const start = new Chess(daily.puzzle.fen);
  const flipped = start.turn() === "b";
  const right = daily.puzzle.solution[0];
  const wrong = start.moves({ verbose: true }).find((m) => m.from + m.to !== right.slice(0, 4) && !m.san.includes("#"));

  const msg = async () => (await ev(`document.querySelector(".task-msg")?.innerText ?? ""`)) ?? "";
  await ev(`[...document.querySelectorAll(".nav button")].find((b) => b.innerText.startsWith("Puzzles")).click()`);
  for (let i = 0; i < 60; i++) { if (/Watch the board/.test(await msg())) break; await sleep(100); }
  expect("the puzzle starts by showing the opponent move", /Watch the board/.test(await msg()), JSON.stringify(await msg()));
  await shot("puzzle-1-intro");
  await sleep(1400);
  expect("then it says which move was played and that it is your turn", /just played .+ your turn/.test(await msg()), JSON.stringify(await msg()));
  expect("that move is highlighted", await ev(`!!document.querySelector(".board .last-to")`));
  await shot("puzzle-2-your-turn");

  const click = async (sq) => {
    const r = JSON.parse(await ev(`JSON.stringify(document.querySelector(".board").getBoundingClientRect())`));
    const file = sq.charCodeAt(0) - 97;
    const rank = Number(sq[1]);
    const x = r.left + (((flipped ? 7 - file : file) + 0.5) / 8) * r.width;
    const y = r.top + (((flipped ? rank - 1 : 8 - rank) + 0.5) / 8) * r.height;
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(200);
  };
  const stepOn = () => ev(`document.querySelector(".task-steps li.on")?.className ?? ""`);
  const button = (text) => ev(`(() => { const b = [...document.querySelectorAll(".task-actions button")].find((x) => x.innerText.trim() === ${JSON.stringify(text)}); if (b) b.click(); return !!b; })()`);

  await click(wrong.from);
  await click(wrong.to);
  await sleep(400);
  expect("a wrong try turns step 2 red", (await stepOn()).includes("wrong"));
  expect("a sign appears on the board at the wrong move", await ev(`!!document.querySelector(".board .badge-pos")`));
  await sleep(3000);
  expect("the wrong try is explained", (await msg()).length > 15, JSON.stringify(await msg()));
  await shot("puzzle-3-wrong");
  expect("try again is offered", await button("Try again"));
  await sleep(500);

  await click(right.slice(0, 2));
  await click(right.slice(2, 4));
  await sleep(300);
  const after = await msg();
  if (daily.puzzle.solution.length > 1) {
    expect("a right move says so and announces the reply", /Good move/.test(after) && /watch the reply/.test(after), JSON.stringify(after));
    await shot("puzzle-4-good");
    await sleep(1500);
    expect("the reply comes calmly with a note", /answered .+ Your move again/.test(await msg()), JSON.stringify(await msg()));
    await shot("puzzle-5-reply");
  } else {
    expect("a one-move puzzle is solved", /Solved/.test(after), JSON.stringify(after));
  }
} finally {
  proc.kill();
}
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exit(failed ? 1 : 0);
