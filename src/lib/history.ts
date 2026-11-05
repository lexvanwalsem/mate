import { readJson, writeJson } from "./store";

export interface HistoryItem {
  title: string;
  pgn: string;
}

const KEY = "zetje-history";
const MAX = 10;

export const loadHistory = (): HistoryItem[] => readJson<{ items: HistoryItem[] }>(KEY, { items: [] }).items;

export function addToHistory(item: HistoryItem) {
  const rest = loadHistory().filter((h) => h.pgn !== item.pgn);
  writeJson(KEY, { items: [item, ...rest].slice(0, MAX) });
}
