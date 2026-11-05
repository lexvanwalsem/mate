// Floating "analyze" button on chess.com and lichess. Also answers the toolbar button.
import { isGameUrl } from "@/lib/gameUrl";

function detectSide(): "white" | "black" | undefined {
  const flipped =
    document.querySelector(".orientation-black") ||
    document.querySelector("wc-chess-board.flipped, chess-board.flipped");
  if (flipped) return "black";
  return document.querySelector(".orientation-white, wc-chess-board, chess-board") ? "white" : undefined;
}

/** The page URL when it is a game, else a game link in the page (e.g. the Game Review button after a chess.com game). */
function findGameUrl(): string | undefined {
  if (isGameUrl(location.href)) return location.href;
  const link = document.querySelector<HTMLAnchorElement>(
    'a[href*="/game/live/"], a[href*="/game/daily/"], a[href*="/analysis/game/"]'
  );
  return link && isGameUrl(link.href) ? link.href : undefined;
}

/** Best effort: the game has ended when a result banner or game-over dialog shows. */
const gameIsOver = () =>
  !!document.querySelector(".result-wrap, .game-over-modal-container, .board-modal-container-container, [class*='game-over']");

const host = document.createElement("div");
host.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647;display:none";
const root = host.attachShadow({ mode: "open" });
root.innerHTML = `
  <style>
    button { all: unset; cursor: pointer; display: flex; align-items: center; gap: 8px; background: #6c4cf5; color: #fff;
      font: 800 15px "Segoe UI", system-ui, sans-serif; padding: 10px 16px 10px 10px; border-radius: 18px; box-shadow: 0 5px 0 #4a2fd0; }
    button:active { transform: translateY(4px); box-shadow: 0 1px 0 #4a2fd0; }
    button.over { animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    svg { width: 34px; height: 34px; }
  </style>
  <button>
    <svg viewBox="0 0 200 200"><rect x="36" y="22" width="30" height="44" rx="12" fill="#a992ff"/><rect x="85" y="14" width="30" height="52" rx="12" fill="#c4b4ff"/><rect x="134" y="22" width="30" height="44" rx="12" fill="#a992ff"/><rect x="28" y="48" width="144" height="124" rx="46" fill="#fff"/><rect x="60" y="86" width="30" height="40" rx="12" fill="#1f1b3a"/><rect x="110" y="86" width="30" height="40" rx="12" fill="#1f1b3a"/></svg>
    <span>${chrome.i18n.getMessage("buttonLabel")}</span>
  </button>`;
const button = root.querySelector("button")!;
button.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "analyze", url: findGameUrl() ?? location.href, side: detectSide() });
});
document.documentElement.appendChild(host);

// The toolbar button asks the page which game is open.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "get-game") reply({ url: findGameUrl(), side: detectSide() });
});

// These sites are single-page apps, so re-check regularly.
setInterval(() => {
  const url = findGameUrl();
  host.style.display = url ? "block" : "none";
  button.classList.toggle("over", !!url && gameIsOver());
}, 1000);
