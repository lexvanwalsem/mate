import { GameAnalysis } from "./analyze";
import { LineEval } from "@/types/eval";
import { MoveClassification as MC } from "@/types/enums";
import { Side, sideOfPosition } from "./stats";
import { getLineWinPercentage } from "@/engine/winPercentage";

/**
 * A position from a game that turns into a small exercise:
 *  mine   - you went wrong, find the better move
 *  punish - your opponent slipped, find the move that punishes it
 *  learn  - your opponent found something strong, can you find it too
 */
export type PracticeKind = "mine" | "punish" | "learn";

export interface PracticeTarget {
  kind: PracticeKind;
  fen: string; // the position to solve
  lines: LineEval[]; // engine lines for that position (white's point of view)
  mover: Side; // who has to move
  bestUci: string;
}

const MINE_BAD = [MC.Inaccuracy, MC.Mistake, MC.Miss, MC.Blunder];

/** The exercise hiding behind move `pos` (position index 1..n), or undefined when the move is not a teachable one. */
export function practiceAt(a: GameAnalysis, pos: number, side: Side): PracticeTarget | undefined {
  const cls = a.positions[pos]?.moveClassification;
  if (pos < 1 || !cls) return undefined;
  const mine = sideOfPosition(pos) === side;
  const opponent: Side = side === "white" ? "black" : "white";
  const before = a.positions[pos - 1];
  const after = a.positions[pos];
  const usable = (p: typeof before) => !!p.bestMove && p.lines.length > 0 && p.lines[0].pv.length > 0;

  if (mine && MINE_BAD.includes(cls) && usable(before)) {
    return { kind: "mine", fen: a.fens[pos - 1], lines: before.lines, mover: side, bestUci: before.bestMove! };
  }
  if (!mine && (cls === MC.Mistake || cls === MC.Blunder) && usable(after)) {
    return { kind: "punish", fen: a.fens[pos], lines: after.lines, mover: side, bestUci: after.bestMove! };
  }
  if (!mine && (cls === MC.Splendid || cls === MC.Perfect) && usable(before)) {
    return { kind: "learn", fen: a.fens[pos - 1], lines: before.lines, mover: opponent, bestUci: before.bestMove! };
  }
  return undefined;
}

const winFor = (l: LineEval, mover: Side) => (mover === "white" ? getLineWinPercentage(l) : 100 - getLineWinPercentage(l));

/** Moves that count as correct: the best move and any engine line within 3 win-percent of it. */
export function acceptedMoves(t: PracticeTarget): string[] {
  const best = Math.max(...t.lines.map((l) => winFor(l, t.mover)));
  return t.lines.filter((l) => winFor(l, t.mover) >= best - 3).map((l) => l.pv[0]);
}

export const isGoodMove = (t: PracticeTarget, uci: string) => acceptedMoves(t).includes(uci);
