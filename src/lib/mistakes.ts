import { GameAnalysis } from "./analyze";
import { MoveClassification as MC } from "@/types/enums";
import { Side, sideOfPosition } from "./stats";
import { uciToSan } from "./chess";
import { getLineWinPercentage } from "@/engine/winPercentage";
import { readJson, writeJson } from "./store";

export interface MistakeItem {
  id: string;
  fen: string; // position before your bad move
  playedSan: string;
  bestUci: string;
  accepted: string[]; // uci moves that count as good (best and near-best lines)
  cls: MC;
}

const KEY = "zetje-mistakes";
const MAX = 60;

export const loadMistakes = (): MistakeItem[] => readJson<{ items: MistakeItem[] }>(KEY, { items: [] }).items;

/** Save your blunders, mistakes and misses from an analysis as practice positions. */
export function saveMistakes(a: GameAnalysis, side: Side) {
  const found: MistakeItem[] = [];
  for (let p = 1; p < a.positions.length; p++) {
    const cls = a.positions[p].moveClassification;
    if (sideOfPosition(p) !== side || (cls !== MC.Blunder && cls !== MC.Mistake && cls !== MC.Miss)) continue;
    const before = a.positions[p - 1];
    if (!before.bestMove || !before.lines.length) continue;
    const wp = (l: (typeof before.lines)[number]) => (side === "white" ? getLineWinPercentage(l) : 100 - getLineWinPercentage(l));
    const best = Math.max(...before.lines.map(wp));
    found.push({
      id: `${a.fens[p - 1]}|${a.uciMoves[p - 1]}`,
      fen: a.fens[p - 1],
      playedSan: a.sans[p - 1],
      bestUci: before.bestMove,
      accepted: before.lines.filter((l) => wp(l) >= best - 3).map((l) => l.pv[0]),
      cls,
    });
  }
  const existing = loadMistakes().filter((m) => !found.some((f) => f.id === m.id));
  writeJson(KEY, { items: [...found, ...existing].slice(0, MAX) });
}

export function removeMistake(id: string) {
  writeJson(KEY, { items: loadMistakes().filter((m) => m.id !== id) });
}

export const bestSan = (m: MistakeItem) => uciToSan(m.fen, m.bestUci) ?? m.bestUci;
