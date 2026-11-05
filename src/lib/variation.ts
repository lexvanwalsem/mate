import { Chess } from "chess.js";
import { PositionEval } from "@/types/eval";
import { MoveClassification as MC } from "@/types/enums";
import { getPositionWinPercentage } from "@/engine/winPercentage";
import { uciMoveParams } from "./chess";

/** Your own line, started from move `base` of the game. `idx` is how many of `moves` are on the board. */
export interface Variation {
  base: number;
  moves: string[];
  idx: number;
}

/** Positions and SAN for a line played from `startFen`. Stops at the first illegal move. */
export function replay(startFen: string, uciMoves: string[]): { fens: string[]; sans: string[]; ucis: string[] } {
  const game = new Chess(startFen);
  const fens = [startFen];
  const sans: string[] = [];
  const ucis: string[] = [];
  for (const uci of uciMoves) {
    try {
      sans.push(game.move(uciMoveParams(uci)).san);
      ucis.push(uci);
      fens.push(game.fen());
    } catch {
      break;
    }
  }
  return { fens, sans, ucis };
}

/** Same thresholds as the game review, applied to a move you tried yourself. */
export function classifyTried(prev: PositionEval, now: PositionEval, uci: string, moverIsWhite: boolean): MC {
  if (prev.bestMove && uci === prev.bestMove) return MC.Best;
  const before = getPositionWinPercentage(prev);
  const after = getPositionWinPercentage(now);
  const loss = moverIsWhite ? before - after : after - before;
  if (loss > 20) return MC.Blunder;
  if (loss > 10) return MC.Mistake;
  if (loss > 5) return MC.Inaccuracy;
  if (loss > 2) return MC.Okay;
  return MC.Excellent;
}

/** "12. Nc3 Nf6 13. Bg5" for a line that starts at game ply `base` (ply 0 = white to move). */
export function lineText(base: number, sans: string[]): string {
  return sans
    .map((san, i) => {
      const ply = base + i;
      const number = Math.floor(ply / 2) + 1;
      if (ply % 2 === 0) return `${number}. ${san}`;
      return i === 0 ? `${number}... ${san}` : san;
    })
    .join(" ");
}
