// Floating "analyse" button on chess.com and lichess game pages.
const GAME_URL = /lichess\.org\/[a-zA-Z0-9]{8}|chess\.com\/(?:[a-z]{2}\/)?(?:analysis\/)?game\/(?:live|daily)\/\d+/;

function detectSide(): "white" | "black" | undefined {
  const flipped =
    document.querySelector(".orientation-black") ||
    document.querySelector("wc-chess-board.flipped, chess-board.flipped");
  if (flipped) return "black";
  const board = document.querySelector(".orientation-white, wc-chess-board, chess-board");
  return board ? "white" : undefined;
}

const host = document.createElement("div");
host.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647;display:none";
const root = host.attachShadow({ mode: "open" });
root.innerHTML = `
  <style>
    button { all: unset; cursor: pointer; display: flex; align-items: center; gap: 8px; background: #6c4cf5; color: #fff;
      font: 800 15px "Segoe UI", system-ui, sans-serif; padding: 10px 16px 10px 10px; border-radius: 18px; box-shadow: 0 5px 0 #4a2fd0; }
    button:active { transform: translateY(4px); box-shadow: 0 1px 0 #4a2fd0; }
    svg { width: 34px; height: 34px; }
  </style>
  <button>
    <svg viewBox="0 0 200 200"><rect x="36" y="22" width="30" height="44" rx="12" fill="#a992ff"/><rect x="85" y="14" width="30" height="52" rx="12" fill="#c4b4ff"/><rect x="134" y="22" width="30" height="44" rx="12" fill="#a992ff"/><rect x="28" y="48" width="144" height="124" rx="46" fill="#fff"/><rect x="60" y="86" width="30" height="40" rx="12" fill="#1f1b3a"/><rect x="110" y="86" width="30" height="40" rx="12" fill="#1f1b3a"/></svg>
    <span>${chrome.i18n.getMessage("buttonLabel")}</span>
  </button>`;
root.querySelector("button")!.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "analyze", url: location.href, side: detectSide() });
});
document.documentElement.appendChild(host);

// These sites are single-page apps, so re-check the URL regularly.
setInterval(() => {
  host.style.display = GAME_URL.test(location.href) ? "block" : "none";
}, 1000);
