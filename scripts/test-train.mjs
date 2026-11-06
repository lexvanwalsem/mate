// End-to-end check of the training flow: the task card, a wrong move that stays on the board with an explanation,
// "Try again", the right move and the follow-up line played move by move.
// Usage: node scripts/test-train.mjs <path-to-chrome-or-edge> <absolute-path-to-dist> [screenshot-folder]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Chess } from "chess.js";

const [browser, dist, shots] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-train-"));
const port = 9413;
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
  const shot = async (name) => { if (shots) writeFileSync(path.join(shots, `${name}.png`), Buffer.from((await send("Page.captureScreenshot")).result.data, "base64")); };
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });

  for (let i = 0; i < 120; i++) { if (await ev(`!!document.querySelector(".summary")`)) break; await sleep(1000); }
  // Starting the review saves the exercises from this game.
  await ev(`[...document.querySelectorAll("button")].find((b) => b.innerText.includes("Start review")).click()`);
  await sleep(500);
  await ev(`[...document.querySelectorAll(".nav button")].find((b) => b.innerText.startsWith("Training")).click()`);
  await sleep(600);

  const item = JSON.parse(await ev(`localStorage.getItem("zetje-mistakes")`)).items[0];
  const flipped = item.fen.split(" ")[1] === "b";
  const game = new Chess(item.fen);
  const wrong = game.moves({ verbose: true }).find((m) => !item.accepted.includes(m.from + m.to + (m.promotion ?? "")));
  const right = item.accepted[0];

  const click = async (sq) => {
    const r = JSON.parse(await ev(`JSON.stringify(document.querySelector(".board").getBoundingClientRect())`));
    const file = sq.charCodeAt(0) - 97;
    const rank = Number(sq[1]);
    const col = flipped ? 7 - file : file;
    const row = flipped ? rank - 1 : 8 - rank;
    const x = r.left + ((col + 0.5) / 8) * r.width;
    const y = r.top + ((row + 0.5) / 8) * r.height;
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(200);
  };
  const card = () => ev(`document.querySelector(".card.task")?.innerText ?? ""`);
  const stepOn = () => ev(`document.querySelector(".task-steps li.on")?.className ?? ""`);
  const button = (text) => ev(`(() => { const b = [...document.querySelectorAll(".task-actions button")].find((x) => x.innerText.trim() === ${JSON.stringify(text)}); if (b) b.click(); return !!b; })()`);

  const first = await card();
  expect("the card shows three steps", (await ev(`document.querySelectorAll(".task-steps li").length`)) === 3);
  expect("step 1 is active and the task is written out", (await stepOn()).includes("on task") && /Find|Vind/.test(first), JSON.stringify(first.slice(0, 120)));
  expect("it says who is to move", /to move/.test(first));
  await shot("train-1-task");

  await click(wrong.from);
  await click(wrong.to);
  await sleep(300);
  expect("a wrong move turns step 2 red", (await stepOn()).includes("wrong"));
  expect("the wrong move stays on the board", await ev(`!!document.querySelector(".board .last-to")`));
  await sleep(3500);
  const wrongText = await ev(`document.querySelector(".task-msg")?.innerText ?? ""`);
  expect("the wrong move is explained", wrongText.length > 20, JSON.stringify(wrongText));
  await shot("train-2-wrong");
  expect("you choose when to try again", await button("Try again"));
  await sleep(300);
  expect("back to step 1 after trying again", (await stepOn()).includes("on task"));

  await click(right.slice(0, 2));
  await click(right.slice(2, 4));
  await sleep(500);
  expect("the right move reaches step 3", (await stepOn()).includes("right"));
  expect("the follow-up can be shown", await button("Show what follows"));
  await sleep(4500);
  const follow = await ev(`document.querySelector(".task-msg")?.innerText ?? ""`);
  expect("the follow-up is played move by move", /What follows: \S+/.test(follow), JSON.stringify(follow));
  await shot("train-3-right");
} finally {
  proc.kill();
}
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exit(failed ? 1 : 0);
