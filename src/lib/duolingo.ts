// Duolingo Chess games: Duolingo keeps your matches behind your login and stores moves as UCI.
// The way to read them follows github.com/JohnVitor-Dev/duolingo-chess-history (MIT): the match list is
// GET /chess/1/<userId>/matches and one match is GET /chess/1/<userId>/matches/<matchId>.
import { Chess } from "chess.js";
import { uciMoveParams } from "./chess";

export interface DuolingoListItem {
  matchId: string | number;
  opponentName?: string;
}

export interface DuolingoMatch {
  moveHistory: string[];
  outcome?: "white" | "black" | "draw" | string;
  playerColor?: "white" | "black";
}

export const DUOLINGO_LIST = /\/chess\/1\/(\d+)\/matches(?:\?|$)/;

const quote = (v: string) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");

/** A PGN of a Duolingo match, with you on your own color. Throws when a move does not fit. */
export function duolingoPgn(match: DuolingoMatch, opponent = "Duolingo Bot", you = "Duolingo player"): string {
  const game = new Chess();
  for (const uci of match.moveHistory) game.move(uciMoveParams(uci));
  const result = match.outcome === "white" ? "1-0" : match.outcome === "black" ? "0-1" : match.outcome === "draw" ? "1/2-1/2" : "*";
  const white = match.playerColor === "black" ? opponent : you;
  const black = match.playerColor === "black" ? you : opponent;
  game.setHeader("Event", "Duolingo Chess");
  game.setHeader("Site", "https://www.duolingo.com/chess-matches");
  game.setHeader("White", quote(white));
  game.setHeader("Black", quote(black));
  game.setHeader("Result", result);
  // chess.js prints its own result token from the position; keep the real one from Duolingo.
  return game.pgn().replace(/\s(1-0|0-1|1\/2-1\/2|\*)\s*$/, "") + ` ${result}\n`;
}
