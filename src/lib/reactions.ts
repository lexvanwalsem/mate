import { Chess, PieceSymbol, Square } from "chess.js";
import type { BoardPiece } from "@/ui/Board";

/** Faces a piece can pull. Only piece sets listed in REACTING_SETS have the extra drawings. */
export type PieceMood = "happy" | "worried" | "shocked";
export const REACTING_SETS = ["blokje"];

let enabled = true;
export const setReactionsEnabled = (on: boolean) => {
  enabled = on;
};
export const reactionsEnabled = () => enabled;

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/**
 * How each piece feels about the position: a king in check is shocked, a piece that can be taken
 * for free or by something cheaper is worried, and the piece that just captured is happy.
 */
export function pieceMoods(pieces: BoardPiece[], pieceSet: string, capturedOn?: string): Map<string, PieceMood> {
  const moods = new Map<string, PieceMood>();
  if (!enabled || !REACTING_SETS.includes(pieceSet)) return moods;

  const board = new Chess();
  board.clear();
  for (const p of pieces) board.put({ type: p.type as PieceSymbol, color: p.color }, p.square as Square);

  for (const p of pieces) {
    const square = p.square as Square;
    const enemy = p.color === "w" ? "b" : "w";
    const attackers = board.attackers(square, enemy);
    if (!attackers.length) continue;
    if (p.type === "k") {
      moods.set(p.id, "shocked");
      continue;
    }
    const cheapest = Math.min(...attackers.map((sq) => VALUE[board.get(sq)?.type ?? "k"]));
    if (!board.isAttacked(square, p.color) || cheapest < VALUE[p.type]) moods.set(p.id, "worried");
  }

  if (capturedOn) {
    const hero = pieces.find((p) => p.square === capturedOn);
    if (hero && !moods.has(hero.id)) moods.set(hero.id, "happy");
  }
  return moods;
}

/** The image for a piece, with its mood when it has one. */
export const pieceSrc = (pieceSet: string, p: { color: string; type: string }, mood?: PieceMood) =>
  `pieces/${pieceSet}/${p.color}${p.type.toUpperCase()}${mood ? `-${mood}` : ""}.svg`;
