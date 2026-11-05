// Opens the analysis page. The page itself fetches the game (it has host permissions).
function openAnalysis(params: { url?: string; pgn?: string; side?: string }) {
  const hash = new URLSearchParams();
  if (params.url) hash.set("url", params.url);
  if (params.pgn) hash.set("pgn", params.pgn);
  if (params.side) hash.set("side", params.side);
  chrome.tabs.create({ url: `${chrome.runtime.getURL("index.html")}#${hash.toString()}` });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "zetje-selection", title: chrome.i18n.getMessage("menuTitle"), contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "zetje-selection" && info.selectionText) openAnalysis({ pgn: info.selectionText });
});

chrome.action.onClicked.addListener((tab) => {
  openAnalysis({ url: tab.url });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "analyze") openAnalysis({ url: msg.url, side: msg.side });
});
