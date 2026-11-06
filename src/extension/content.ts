// Floating "analyze" button on chess.com and lichess. Also answers the toolbar button.
import { isGameUrl } from "@/lib/gameUrl";
import { BLOKJE_BODY } from "@/ui/blokjeShape";

function detectSide(): "white" | "black" | undefined {
  const flipped =
    document.querySelector(".orientation-black") ||
    document.querySelector("wc-chess-board.flipped, chess-board.flipped");
  if (flipped) return "black";
  return document.querySelector(".orientation-white, wc-chess-board, chess-board") ? "white" : undefined;
}

const platform = location.hostname.includes("lichess") ? "lichess" : "chesscom";

/** Best effort: the logged-in user, or the player at the bottom of the board. */
function detectUser(): string | undefined {
  const sel =
    platform === "lichess"
      ? "#user_tag"
      : ".board-layout-bottom .user-username-component, .player-bottom .user-username-component, [data-test-element=\"user-tagline-username\"]";
  const text = document.body.dataset.user || document.querySelector(sel)?.textContent;
  return text?.trim().replace(/^\W+/, "") || undefined;
}

/** The page URL when it is a game, else a game link in the page (e.g. the Game Review button after a chess.com game). */
function findGameUrl(): string | undefined {
  if (isGameUrl(location.href)) return location.href;
  const link = document.querySelector<HTMLAnchorElement>(
    'a[href*="/game/live/"], a[href*="/game/daily/"], a[href*="/analysis/game/"]'
  );
  return link && isGameUrl(link.href) ? link.href : undefined;
}

/** What to analyze: the open game, or else the latest game of this user on this site. */
const target = () => findGameUrl() ?? `latest:${platform}:${detectUser() ?? ""}`;

/** Best effort: the game has ended when a result banner or game-over dialog shows. */
const gameIsOver = () =>
  !!document.querySelector(".result-wrap, .game-over-modal-container, .board-modal-container-container, [class*='game-over']");

const POS_KEY = "zetje-button-pos";
const host = document.createElement("div");
host.style.cssText = "position:fixed;z-index:2147483647;right:20px;bottom:20px;";
const root = host.attachShadow({ mode: "open" });
root.innerHTML = `
  <style>
    button { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; gap: 10px; height: 48px;
      padding: 6px 18px 6px 6px; background: #6c4cf5; color: #fff; border-radius: 24px 24px 24px 10px;
      font: 600 14px "Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif; letter-spacing: 0.1px;
      box-shadow: 0 8px 22px rgba(74, 47, 208, 0.38), inset 0 -3px 0 rgba(0, 0, 0, 0.16); transition: transform 0.15s, box-shadow 0.15s; user-select: none; }
    button:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(74, 47, 208, 0.45), inset 0 -3px 0 rgba(0, 0, 0, 0.16); }
    button:active { transform: translateY(1px); }
    button.over { animation: pulse 1.4s ease-in-out infinite; }
    .face { width: 36px; height: 36px; flex: none; }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
    @media (prefers-reduced-motion: reduce) { button { transition: none; animation: none !important; } }
  </style>
  <button>
    <svg class="face" viewBox="0 0 200 200">
      <path d="${BLOKJE_BODY}" fill="#fff"/>
      <rect x="68" y="88" width="28" height="34" rx="13" fill="#1f1b3a"/><rect x="104" y="88" width="28" height="34" rx="13" fill="#1f1b3a"/>
      <circle cx="86" cy="99" r="5" fill="#fff"/><circle cx="122" cy="99" r="5" fill="#fff"/>
      <path d="M88 140 Q100 150 112 140" fill="none" stroke="#1f1b3a" stroke-width="7" stroke-linecap="round"/>
    </svg>
    <span>${chrome.i18n.getMessage("buttonLabel")}</span>
  </button>`;
const button = root.querySelector("button")!;

// Restore a saved position and let the user drag the button out of the way of the site UI.
try {
  const saved = JSON.parse(localStorage.getItem(POS_KEY) ?? "null");
  if (saved) Object.assign(host.style, { left: `${saved.x}px`, top: `${saved.y}px`, right: "auto", bottom: "auto" });
} catch {
  // no saved position
}

let dragged = false;
button.addEventListener("pointerdown", (down) => {
  const rect = host.getBoundingClientRect();
  const dx = down.clientX - rect.left;
  const dy = down.clientY - rect.top;
  dragged = false;
  const move = (e: PointerEvent) => {
    if (!dragged && Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < 5) return;
    dragged = true;
    const x = Math.min(Math.max(0, e.clientX - dx), window.innerWidth - rect.width);
    const y = Math.min(Math.max(0, e.clientY - dy), window.innerHeight - rect.height);
    Object.assign(host.style, { left: `${x}px`, top: `${y}px`, right: "auto", bottom: "auto" });
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    if (dragged) {
      try {
        const r = host.getBoundingClientRect();
        localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top }));
      } catch {
        // storage blocked, position just will not persist
      }
    }
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
});

button.addEventListener("click", () => {
  if (dragged) return;
  chrome.runtime.sendMessage({ type: "analyze", url: target(), side: detectSide() });
});
document.documentElement.appendChild(host);

// The toolbar button asks the page which game is open.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "get-game") reply({ url: target(), side: detectSide() });
});

// These sites are single-page apps, so re-check regularly.
setInterval(() => {
  button.classList.toggle("over", !!findGameUrl() && gameIsOver());
}, 1000);
