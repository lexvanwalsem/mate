import { isGameUrl } from "@/lib/gameUrl";

// Opens the analysis page. The page itself fetches the game (it has host permissions).
function openAnalysis(params: { url?: string; pgn?: string; side?: string }) {
  const hash = new URLSearchParams();
  if (params.url) hash.set("url", params.url);
  if (params.pgn) hash.set("pgn", params.pgn);
  if (params.side) hash.set("side", params.side);
  const suffix = hash.toString();
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") + (suffix ? `#${suffix}` : "") });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "zetje-selection", title: chrome.i18n.getMessage("menuTitle"), contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "zetje-selection" && info.selectionText) openAnalysis({ pgn: info.selectionText });
});

// Toolbar button: ask the page for its game, fall back to the tab URL, else just open Zetje.
chrome.action.onClicked.addListener((tab) => {
  const fallback = () => openAnalysis({ url: tab.url && isGameUrl(tab.url) ? tab.url : undefined });
  if (tab.id === undefined) return fallback();
  chrome.tabs.sendMessage(tab.id, { type: "get-game" }, (res) => {
    if (chrome.runtime.lastError || !res?.url) return fallback();
    openAnalysis({ url: res.url, side: res.side });
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "analyze") openAnalysis({ url: msg.url, side: msg.side });
});
