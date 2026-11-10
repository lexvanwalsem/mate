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

// Runs inside any page (no content script there): look for a selected or visible PGN, or a game link.
function scanPage(): { pgn?: string; url?: string } {
  const looksLikePgn = (s: string) => /\[(Event|White|Black)\s+"/.test(s) && /\b1\.\s*\S+/.test(s);
  const selected = String(getSelection() ?? "");
  if (looksLikePgn(selected)) return { pgn: selected };
  for (const el of Array.from(document.querySelectorAll("pre, textarea, code"))) {
    const text = (el as HTMLElement).innerText || (el as HTMLTextAreaElement).value || "";
    if (looksLikePgn(text)) return { pgn: text };
  }
  const link = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).find((a) =>
    /lichess\.org\/[a-zA-Z0-9]{8}|chess\.com\/(?:[a-z]{2}\/)?(?:analysis\/)?game\/(?:live|daily)\/\d+/.test(a.href)
  );
  return link ? { url: link.href } : {};
}

// Toolbar button: ask the content script (chess.com, lichess, duolingo); on other sites scan the page; else just open Zetje.
chrome.action.onClicked.addListener((tab) => {
  const scanOrOpen = async () => {
    try {
      const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id! }, func: scanPage });
      openAnalysis((res?.result as { pgn?: string; url?: string }) ?? {});
    } catch {
      openAnalysis({ url: tab.url && isGameUrl(tab.url) ? tab.url : undefined });
    }
  };
  if (tab.id === undefined) return openAnalysis({});
  chrome.tabs.sendMessage(tab.id, { type: "get-game" }, (res) => {
    if (chrome.runtime.lastError || !(res?.url || res?.pgn)) return void scanOrOpen();
    openAnalysis({ url: res.url, pgn: res.pgn, side: res.side });
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "analyze") openAnalysis({ url: msg.url, pgn: msg.pgn, side: msg.side });
});
