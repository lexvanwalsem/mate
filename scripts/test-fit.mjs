// Loads the built extension and walks through every screen at several window sizes, reporting overflow and saving screenshots.
// Usage: node scripts/test-fit.mjs <path-to-chrome-or-edge> dist <output-folder>
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [browser, dist, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const profile = mkdtempSync(path.join(tmpdir(), "zetje-fit-"));
const port = 9344;
const proc = spawn(browser, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--enable-unsafe-extension-debugging", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).json();

try {
  for (let i = 0; i < 40; i++) { try { await getJson("/json/version"); break; } catch { await sleep(300); } }
  const ver = await getJson("/json/version");
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => (bws.onopen = r));
  const loaded = await new Promise((res) => { bws.onmessage = (m) => res(JSON.parse(m.data)); bws.send(JSON.stringify({ id: 1, method: "Extensions.loadUnpacked", params: { path: dist } })); });
  const id = loaded.result.id;

  const pgn = "[White \"Lance\"]\n[Black \"Tryer\"]\n[WhiteElo \"1650\"]\n[BlackElo \"1700\"]\n[Result \"1-0\"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. a4 Bf8 14. Nf1 g6 15. Bg5 h6 16. Bd2 Bg7 17. Ng3 c5 18. d5 c4 19. b4 cxb3 20. Bxb3 Nc5 21. Bc2 a5 22. Qe2 Qc7 1-0";
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
  await send("Runtime.enable");

  for (let i = 0; i < 120; i++) { if (/accuracy/i.test((await ev("document.body.innerText.slice(0,400)")) ?? "")) break; await sleep(1000); }

  // DARK=1 takes the same screenshots in dark mode.
  if (process.env.DARK) await ev("document.querySelector('.theme-btn').click()");
  const sizes = [[1366, 768], [1920, 1080]];
  const measure = `(() => { const m = document.querySelector('.main'); const s = document.querySelector('.main .screen');
    const overflow = m.scrollHeight - m.clientHeight; const bodyOverflow = document.documentElement.scrollHeight - innerHeight;
    return JSON.stringify({ mainOverflow: overflow, pageOverflow: bodyOverflow }); })()`;
  const click = (text) => ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim().startsWith(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);

  for (const [w, h] of sizes) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    const steps = [
      ["summary", async () => { await click("Analyze"); }],
      ["review", async () => { await click("Start review"); await sleep(300); await ev("document.querySelectorAll('.move')[14]?.click()"); }],
      ["lessons", async () => { await click("Lessons"); }],
      ["lesson", async () => { await ev("document.querySelector('.lesson-btn')?.click()"); await click("Next"); }],
      ["puzzles", async () => { await click("Puzzles"); await sleep(2500); }],
      ["training", async () => { await click("Training"); await sleep(800); }],
      ["home", async () => { await click("Analyze"); await click("Back to summary"); await click("Another game"); }],
    ];
    for (const [name, act] of steps) {
      await act();
      await sleep(600);
      const m = await ev(measure);
      const shot = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(path.join(outDir, `${w}x${h}-${name}.png`), Buffer.from(shot.result.data, "base64"));
      console.log(`${w}x${h} ${name}: ${m}`);
    }
  }
} finally {
  proc.kill();
}
