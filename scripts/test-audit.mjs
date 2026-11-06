// Walks through every screen in both languages and reports text that is clipped, clamped or spills out of its box.
// Usage: node scripts/test-audit.mjs <path-to-chrome-or-edge> dist
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [browser, dist] = process.argv.slice(2);
const profile = mkdtempSync(path.join(tmpdir(), "zetje-audit-"));
const port = 9355;
const proc = spawn(browser, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--enable-unsafe-extension-debugging", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).json();

const PGN = `[White "Lance"]\n[Black "A very long player name for testing"]\n[WhiteElo "1650"]\n[BlackElo "1700"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. a4 Bf8 14. Nf1 g6 15. Bg5 h6 16. Bd2 Bg7 17. Ng3 c5 18. d5 c4 19. b4 cxb3 20. Bxb3 Nc5 21. Bc2 a5 22. Qe2 Qc7 1-0`;

// Runs inside the page: lists clipped or spilling text.
const AUDIT = `(() => {
  const out = [];
  const label = (el) => (el.className && typeof el.className === "string" ? el.tagName.toLowerCase() + "." + el.className.split(" ").filter(Boolean).slice(0, 2).join(".") : el.tagName.toLowerCase());
  const text = (el) => (el.innerText || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 50);
  for (const el of document.querySelectorAll(".app *")) {
    if (el.closest("svg") || el.classList.contains("board") || el.closest(".board")) continue;
    const cs = getComputedStyle(el);
    const clipped = cs.overflow !== "visible" && cs.overflow !== "auto" && cs.overflow !== "scroll" && cs.overflowY !== "auto" && cs.overflowY !== "scroll";
    const xs = el.scrollWidth - el.clientWidth, ys = el.scrollHeight - el.clientHeight;
    if (clipped || cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none") {
      if (xs > 1) out.push("clipped-x " + label(el) + " (" + xs + "px): " + text(el));
      if (ys > 1) out.push("clipped-y " + label(el) + " (" + ys + "px): " + text(el));
    }
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1) && !el.closest(".movelist") && !el.closest(".confetti")) out.push("off-screen " + label(el) + ": " + text(el));
  }
  const bubble = document.querySelector(".bubble");
  if (bubble) for (const b of bubble.querySelectorAll("button")) { const br = b.getBoundingClientRect(), pr = bubble.getBoundingClientRect(); if (br.bottom > pr.bottom + 1 || br.right > pr.right + 1) out.push("button outside bubble: " + text(b)); }
  return JSON.stringify([...new Set(out)]);
})()`;

try {
  for (let i = 0; i < 40; i++) { try { await getJson("/json/version"); break; } catch { await sleep(300); } }
  const ver = await getJson("/json/version");
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => (bws.onopen = r));
  const loaded = await new Promise((res) => { bws.onmessage = (m) => res(JSON.parse(m.data)); bws.send(JSON.stringify({ id: 1, method: "Extensions.loadUnpacked", params: { path: dist } })); });
  const id = loaded.result.id;
  const base = `chrome-extension://${id}/index.html`;

  const page = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(base)}`, { method: "PUT" })).json();
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
  // Entrance animations move things a few pixels while they play; measure the settled layout instead.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const click = (text) => ev(`(() => { const b = [...document.querySelectorAll("button")].find(x => x.innerText.trim().startsWith(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);

  const problems = [];
  let checks = 0;
  const check = async (where) => {
    checks++;
    const found = JSON.parse((await ev(AUDIT)) ?? "[]");
    for (const f of found) problems.push(`${where}: ${f}`);
  };

  for (const lang of ["en", "nl"]) {
    for (const [w, h] of [[1366, 768], [1280, 720]]) {
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      await send("Page.navigate", { url: base });
      await sleep(500);
      await ev(`localStorage.setItem("zetje-settings", JSON.stringify({ lang: "${lang}" })); localStorage.removeItem("zetje-mistakes");`);
      await send("Page.navigate", { url: `${base}#pgn=${encodeURIComponent(PGN)}&side=white` });
      await send("Page.reload");
      for (let i = 0; i < 120; i++) { if (await ev(`!!document.querySelector(".summary")`)) break; await sleep(1000); }
      const tag = `${lang} ${w}x${h}`;
      console.log(tag, "summary found:", await ev(`!!document.querySelector('.summary')`));

      await check(`${tag} summary`);
      await click(lang === "en" ? "Start review" : "Start review");
      await sleep(300);
      const moves = await ev(`document.querySelectorAll(".move").length`);
      for (let m = 0; m < moves; m++) {
        await ev(`document.querySelectorAll(".move")[${m}].click()`);
        await sleep(40);
        await check(`${tag} review move ${m + 1}`);
        if (await ev(`!![...document.querySelectorAll(".bubble button")].find(b => b.className.includes("primary"))`)) {
          await click(lang === "en" ? "Try again" : "Probeer opnieuw");
          await check(`${tag} review retry ${m + 1}`);
          await click(lang === "en" ? "Stop" : "Stoppen");
        }
      }
      await click(lang === "en" ? "Lessons" : "Lessen");
      await check(`${tag} lessons`);
      const lessonCount = await ev(`document.querySelectorAll(".lesson-btn").length`);
      for (let l = 0; l < lessonCount; l++) {
        await click(lang === "en" ? "Lessons" : "Lessen");
        await ev(`document.querySelectorAll(".lesson-btn")[${l}].click()`);
        for (let step = 0; step < 6; step++) {
          await check(`${tag} lesson ${l + 1} step ${step + 1}`);
          await click(lang === "en" ? "Hint" : "Hint");
          await check(`${tag} lesson ${l + 1} step ${step + 1} hint`);
          if (!(await click(lang === "en" ? "Next" : "Volgende"))) break;
        }
      }
      await click(lang === "en" ? "Puzzles" : "Puzzels");
      await sleep(2500);
      await check(`${tag} puzzles`);
      await click(lang === "en" ? "My mistakes" : "Mijn fouten");
      await check(`${tag} mistakes`);
      await click(lang === "en" ? "Analyze" : "Analyseer");
      await click(lang === "en" ? "Back to summary" : "Terug naar samenvatting");
      await click(lang === "en" ? "Another game" : "Andere partij");
      await check(`${tag} home`);
    }
  }

  console.log(`${checks} screen states checked`);
  // Collapse repeats: same message in many places is one problem.
  const unique = new Map();
  for (const p of problems) {
    const [where, ...rest] = p.split(": ");
    const msg = rest.join(": ");
    const key = msg.replace(/(d+px).*/, "").replace(/ d+.*/, "").trim();
    if (!unique.has(key)) unique.set(key, `${where} | ${msg.slice(0, 90)}`);
  }
  console.log(unique.size ? `${unique.size} distinct problems:` : "no clipped or spilling text found");
  for (const [key, sample] of unique) console.log(`- ${key}  e.g. [${sample}]`);
  process.exitCode = unique.size ? 1 : 0;
} finally {
  proc.kill();
}
