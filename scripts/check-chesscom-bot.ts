// Loads a chess.com game against a bot from its review URL (needs internet) and checks names, moves and the end.
// Usage: npx tsx scripts/check-chesscom-bot.ts [url]
import { Chess } from "chess.js";
import { loadGame } from "../src/lib/sources";

const url = process.argv[2] ?? "https://www.chess.com/analysis/game/computer/2616667942/review?move=64";
const game = await loadGame(url);
const board = new Chess();
board.loadPgn(game.pgn);
const h = board.getHeaders();
let failed = 0;
const expect = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${detail}`);
  if (!ok) failed++;
};
expect("the real players are named", /BOT/i.test(`${h.White} ${h.Black}`), `${h.White} vs ${h.Black}`);
expect("the whole game is there", board.history().length > 10, String(board.history().length));
expect("the result and how it ended come along", !!h.Result && !!h.Termination, `${h.Result} ${h.Termination}`);
process.exit(failed ? 1 : 0);
