// Checks the Duolingo match to PGN conversion. Usage: npx tsx scripts/check-duolingo.ts
import { Chess } from "chess.js";
import { duolingoPgn } from "../src/lib/duolingo";

let failed = 0;
const expect = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${detail}`);
  if (!ok) failed++;
};

const mate = duolingoPgn({ moveHistory: ["f2f3", "e7e5", "g2g4", "d8h4"], outcome: "black", playerColor: "black" }, "Oscar");
expect("you stand on your own color", /\[White "Oscar"\]/.test(mate) && /\[Black "Duolingo player"\]/.test(mate));
expect("the result comes from Duolingo", /\[Result "0-1"\]/.test(mate) && mate.trim().endsWith("0-1"));
expect("moves are written in SAN", /1\. f3 e5 2\. g4 Qh4#/.test(mate), JSON.stringify(mate));
const back = new Chess();
back.loadPgn(mate);
expect("the PGN loads again", back.isCheckmate());

const promo = duolingoPgn({ moveHistory: ["e2e4", "d7d5", "e4d5", "c7c6", "d5c6", "d8d2", "b1d2", "e8d8", "c6b7", "d8c7", "b7a8q"], outcome: "white", playerColor: "white" });
expect("promotion is kept", /bxa8=Q/.test(promo), JSON.stringify(promo.split("\n").pop()));
let threw = false;
try { duolingoPgn({ moveHistory: ["e2e5"] }); } catch { threw = true; }
expect("an impossible move is refused", threw);
process.exit(failed ? 1 : 0);
