export interface HistoryItem {
  title: string;
  pgn: string;
}

const KEY = "zetje-history";
const MAX = 10;

export function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addToHistory(item: HistoryItem) {
  try {
    const rest = loadHistory().filter((h) => h.pgn !== item.pgn);
    localStorage.setItem(KEY, JSON.stringify([item, ...rest].slice(0, MAX)));
  } catch {
    // storage may be unavailable, history just will not persist
  }
}
