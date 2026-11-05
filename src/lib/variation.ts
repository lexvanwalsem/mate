import { Chess, Square } from "chess.js";
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

/** The same position with the other side to move (en passant is dropped). Lets you move a piece out of turn. */
export function flipTurn(fen: string): string {
  const parts = fen.split(" ");
  parts[1] = parts[1] === "w" ? "b" : "w";
  parts[3] = "-";
  return parts.join(" ");
}

/** A game on `fen` where `color` is to move. */
export const withTurn = (fen: string, color: "w" | "b"): Chess => new Chess(fen.split(" ")[1] === color ? fen : flipTurn(fen));

/**
 * Positions, SAN and movers for a line played from `startFen`. Moves may repeat a colour (a free analysis board).
 * Stops at the first illegal move.
 */
export function replay(startFen: string, uciMoves: string[]): { fens: string[]; sans: string[]; ucis: string[]; movers: ("w" | "b")[] } {
  let game = new Chess(startFen);
  const fens = [startFen];
  const sans: string[] = [];
  const ucis: string[] = [];
  const movers: ("w" | "b")[] = [];
  for (const uci of uciMoves) {
    try {
      const piece = game.get(uci.slice(0, 2) as Square);
      if (piece && piece.color !== game.turn()) game = new Chess(flipTurn(game.fen()));
      const color = game.turn();
      sans.push(game.move(uciMoveParams(uci)).san);
      movers.push(color);
      ucis.push(uci);
      fens.push(game.fen());
    } catch {
      break;
    }
  }
  return { fens, sans, ucis, movers };
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

/** "12. Nc3 Nf6 13. Bg5", numbered from the positions so repeated colours still read right. */
export function lineText(fens: string[], sans: string[], movers: ("w" | "b")[]): string {
  return sans
    .map((san, i) => {
      const number = fens[i].split(" ")[5] ?? "1";
      if (movers[i] === "w") return `${number}. ${san}`;
      return i === 0 || movers[i - 1] === "b" ? `${number}... ${san}` : san;
    })
    .join(" ");
}
