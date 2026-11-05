// End-to-end check: loads dist/ as an unpacked extension in a headless Chromium browser and analyzes a PGN.
// Usage: node scripts/test-extension.mjs <path-to-chrome-or-edge> dist
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [browser, dist] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-prof-"));
const port = 9333;
const proc = spawn(browser, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--enable-unsafe-extension-debugging", "--no-first-run", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).json();

try {
  let targets = [];
  for (let i = 0; i < 40; i++) {
    try { targets = await getJson("/json/list"); if (targets.length) break; } catch {}
    await sleep(500);
  }
  const ver = await getJson("/json/version");
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => (bws.onopen = r));
  const loaded = await new Promise((res) => { bws.onmessage = (m) => res(JSON.parse(m.data)); bws.send(JSON.stringify({ id: 1, method: "Extensions.loadUnpacked", params: { path: dist } })); });
  console.log("loadUnpacked:", JSON.stringify(loaded));
  const id = loaded.result?.id;
  if (!id) process.exit(2);

  const pgn = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7";
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
  await send("Runtime.enable");
  let text = "";
  for (let i = 0; i < 90; i++) {
    const r = await send("Runtime.evaluate", { expression: "document.body.innerText.slice(0,200)", returnByValue: true });
    text = r.result?.result?.value ?? "";
    if (/accuracy|nauwkeurigheid/i.test(text)) break;
    await sleep(1000);
  }
  console.log("page text:", JSON.stringify(text));
  const ok = /accuracy|nauwkeurigheid/i.test(text);
  console.log(ok ? "ENGINE RUNS IN EXTENSION: yes" : "FAILED");
  process.exitCode = ok ? 0 : 1;
} finally {
  proc.kill();
}
