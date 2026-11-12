// Checks the chess.com TCN decoder on a real 66-ply game against a bot that ends in checkmate,
// plus a promotion. Usage: npx tsx scripts/check-tcn.ts
import { Chess } from "chess.js";
import { decodeTcn } from "../src/lib/tcn";

let failed = 0;
const expect = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${detail}`);
  if (!ok) failed++;
};

const GAME = "mCYIiqIAjz3NfA7Ylt0Kbs!Vgv9zqzZRsJY7eg6ZcM1TJT2TMFXHAJ70J45Qks074X81aWQWda10aW78fa8!ow!5FT0TWOV1XJNFwF59sA9!gfZxfm!EJ1xoORT21SovmuED";
const g = new Chess();
let legal = true;
try {
  for (const m of decodeTcn(GAME)) g.move(m);
} catch {
  legal = false;
}
expect("every move of the game is legal", legal);
expect("all 66 half-moves are there", g.history().length === 66, String(g.history().length));
expect("the game ends in checkmate, as chess.com says", g.isCheckmate(), g.history().slice(-3).join(" "));

// e7-e8 promotion to a queen, encoded the way chess.com does it
const promo = decodeTcn("0~")[0];
expect("a promotion decodes to a square and a piece", promo.from === "e7" && promo.to === "e8" && promo.promotion === "q", JSON.stringify(promo));
process.exit(failed ? 1 : 0);
