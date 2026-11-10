// On duolingo.com: an "Analyze" button on every row of your chess match history, and the toolbar button
// analyzes your latest match. The match list arrives from duolingo-hook.ts (the page's own request).
import { DUOLINGO_LIST, DuolingoListItem, DuolingoMatch, duolingoPgn } from "@/lib/duolingo";
import { BLOKJE_BODY } from "@/ui/blokjeShape";

const USER_KEY = "mate-duolingo-user";
const ROWS = '[data-test="chess-match-history-row"]';
let userId: string | undefined;
let matches: DuolingoListItem[] = [];

try {
  userId = localStorage.getItem(USER_KEY) ?? undefined;
} catch {
  // storage blocked: wait for the page to load the match list
}

window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.source !== "mate-duolingo") return;
  const m = String(e.data.url).match(DUOLINGO_LIST);
  if (!m) return;
  userId = m[1];
  try {
    localStorage.setItem(USER_KEY, userId);
    matches = JSON.parse(e.data.body).matchHistory ?? matches;
  } catch {
    // not the list we expected
  }
  decorate();
});

const base = () => `${location.origin}/chess/1/${userId}/matches`;

async function listMatches(): Promise<DuolingoListItem[]> {
  if (!matches.length && userId) {
    const res = await fetch(`${base()}?matchesLimit=50`, { credentials: "include" });
    if (res.ok) matches = (await res.json()).matchHistory ?? [];
  }
  return matches;
}

async function gameOf(item: DuolingoListItem): Promise<{ pgn: string; side: "white" | "black" }> {
  const res = await fetch(`${base()}/${encodeURIComponent(String(item.matchId))}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Duolingo answered ${res.status}`);
  const match: DuolingoMatch = (await res.json()).match;
  return { pgn: duolingoPgn(match, item.opponentName || "Duolingo Bot"), side: match.playerColor === "black" ? "black" : "white" };
}

const LABEL = chrome.i18n.getMessage("buttonLabel");
const ICON = `<svg viewBox="0 0 200 200" width="18" height="18" aria-hidden="true"><path d="${BLOKJE_BODY}" fill="#fff"/><rect x="68" y="88" width="28" height="34" rx="13" fill="#1f1b3a"/><rect x="104" y="88" width="28" height="34" rx="13" fill="#1f1b3a"/></svg>`;

function makeButton(item: DuolingoListItem): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mate-analyze";
  btn.style.cssText =
    "all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;height:32px;margin-left:10px;padding:0 12px 0 8px;" +
    "border-radius:16px 16px 16px 6px;background:#6c4cf5;color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer;" +
    "box-shadow:0 4px 12px rgba(74,47,208,.35);flex:none;white-space:nowrap;";
  btn.innerHTML = `${ICON}<span>${LABEL}</span>`;
  const text = btn.querySelector("span")!;
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    text.textContent = "...";
    try {
      const game = await gameOf(item);
      chrome.runtime.sendMessage({ type: "analyze", pgn: game.pgn, side: game.side });
      text.textContent = LABEL;
    } catch {
      text.textContent = "!";
      window.setTimeout(() => (text.textContent = LABEL), 1500);
    }
  });
  return btn;
}

// Rows and matches come in the same order (newest first). Only decorate when every row has its match.
function decorate() {
  const rows = document.querySelectorAll<HTMLElement>(ROWS);
  if (!rows.length || rows.length > matches.length) return;
  rows.forEach((row, i) => {
    if (row.querySelector(".mate-analyze")) return;
    row.appendChild(makeButton(matches[i]));
  });
}

// Duolingo is a single-page app: rows appear and change while you browse.
window.setInterval(decorate, 1000);

// The toolbar button asks which game to open: your latest match.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type !== "get-game") return;
  listMatches()
    .then((list) => (list[0] ? gameOf(list[0]) : undefined))
    .then((game) => reply(game ?? {}))
    .catch(() => reply({}));
  return true; // answer comes later
});
