import { Chess } from "chess.js";
import { Side } from "./stats";

/** How a game ended. The board shows it on the kings, the coach says it at the last move. */
export type EndReason = "checkmate" | "stalemate" | "timeout" | "resign" | "abandon" | "repetition" | "insufficient" | "fifty" | "agreement" | "draw" | "unknown";

export interface GameEnd {
  reason: EndReason;
  winner?: Side; // undefined for a draw or an unknown end
}

/**
 * Reads the end from the final position first (checkmate and stalemate are certain there),
 * then from the Termination and Result headers that lichess and chess.com write.
 */
export function gameEnd(finalFen: string, headers: Record<string, string>): GameEnd | undefined {
  const result = headers.Result;
  const winner: Side | undefined = result === "1-0" ? "white" : result === "0-1" ? "black" : undefined;
  const board = new Chess(finalFen);
  if (board.isCheckmate()) return { reason: "checkmate", winner: board.turn() === "w" ? "black" : "white" };
  if (board.isStalemate()) return { reason: "stalemate" };

  const term = (headers.Termination ?? "").toLowerCase();
  if (!result || result === "*") return undefined;
  if (/time|timeout|forfeit/.test(term)) return winner ? { reason: "timeout", winner } : { reason: "insufficient" };
  if (/resign/.test(term)) return { reason: "resign", winner };
  if (/abandon/.test(term)) return { reason: "abandon", winner };
  if (/repetition/.test(term)) return { reason: "repetition" };
  if (/insufficient/.test(term) || (!winner && board.isInsufficientMaterial())) return { reason: "insufficient" };
  if (/50|fifty/.test(term)) return { reason: "fifty" };
  if (/agree/.test(term)) return { reason: "agreement" };
  if (result === "1/2-1/2") return { reason: "draw" };
  // A decisive result without a mate on the board and no reason given: almost always a resignation.
  return winner ? { reason: term ? "unknown" : "resign", winner } : undefined;
}
