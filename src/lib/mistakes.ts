import { GameAnalysis } from "./analyze";
import { MoveClassification as MC } from "@/types/enums";
import { Side } from "./stats";
import { uciToSan } from "./chess";
import { PracticeKind, acceptedMoves, practiceAt } from "./practice";
import { readJson, writeJson } from "./store";
import { Chess } from "chess.js";

/** From and to squares of a SAN move, or undefined when it does not fit the position. */
export function moveSquares(fen: string, san: string): { from: string; to: string } | undefined {
  try {
    const m = new Chess(fen).move(san);
    return { from: m.from, to: m.to };
  } catch {
    return undefined;
  }
}

/** One saved exercise from an analyzed game (the file keeps its old name, it now holds all practice kinds). */
export interface MistakeItem {
  id: string;
  kind?: PracticeKind; // missing in older saves, means "mine"
  fen: string; // the position to solve
  playedSan: string; // the move that was played in the game
  bestUci: string;
  accepted: string[]; // uci moves that count as good
  cls: MC;
  /** The move that led to this position (shown on the board for "punish"). Missing in older saves. */
  lastMove?: { from: string; to: string };
}

const KEY = "zetje-mistakes";
const MAX = 80;
const PER_GAME_OPPONENT = 5; // keep the deck tidy: at most this many opponent exercises per game

export const loadMistakes = (): MistakeItem[] => readJson<{ items: MistakeItem[] }>(KEY, { items: [] }).items;

/** Turn your mistakes, your opponent's slips and their strong moves into practice positions. */
export function saveTraining(a: GameAnalysis, side: Side) {
  const mine: MistakeItem[] = [];
  const opponent: MistakeItem[] = [];
  for (let p = 1; p < a.positions.length; p++) {
    const target = practiceAt(a, p, side);
    if (!target) continue;
    const item: MistakeItem = {
      id: `${target.fen}|${target.kind}`,
      kind: target.kind,
      fen: target.fen,
      playedSan: a.sans[p - 1],
      bestUci: target.bestUci,
      accepted: acceptedMoves(target),
      cls: a.positions[p].moveClassification!,
      lastMove: target.kind === "punish" ? moveSquares(a.fens[p - 1], a.sans[p - 1]) : undefined,
    };
    (target.kind === "mine" ? mine : opponent).push(item);
  }
  const found = [...mine, ...opponent.slice(0, PER_GAME_OPPONENT)];
  const existing = loadMistakes().filter((m) => !found.some((f) => f.id === m.id));
  writeJson(KEY, { items: [...found, ...existing].slice(0, MAX) });
}

export function removeMistake(id: string) {
  writeJson(KEY, { items: loadMistakes().filter((m) => m.id !== id) });
}

export const bestSan = (m: MistakeItem) => uciToSan(m.fen, m.bestUci) ?? m.bestUci;
