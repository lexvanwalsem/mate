// Checks the material check on top of the win-percentage classification. Usage: npx tsx scripts/check-material-loss.ts
import { applyMaterialLoss, calmLead } from "../src/lib/materialLoss";
import { PositionEval } from "../src/types/eval";
import { MoveClassification as MC } from "../src/types/enums";

let failed = 0;
const expect = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${detail}`);
  if (!ok) failed++;
};

// Black rook on g1, white king on f3, black to move. White mates soon anyway, so win percentages see no difference.
const FEN = "6k1/8/8/8/8/5K2/8/6r1 b - - 0 1";
const AFTER = "6k1/8/8/8/6r1/5K2/8/8 w - - 1 2";
const line = (pv: string[], mate?: number) => ({ pv, mate, depth: 18, multiPv: 1 });

function run(played: string, bestPv: string[], replyPv: string[], cls: MC) {
  const positions: PositionEval[] = [
    { lines: [line(bestPv, 5)], bestMove: bestPv[0] },
    { lines: [line(replyPv, 2)], moveClassification: cls },
  ];
  return applyMaterialLoss(positions, [FEN, AFTER], [played])[1].moveClassification;
}

expect("calm material counts a capture at the end", calmLead(FEN, ["g1g4", "f3g4", "g8f7", "g4f5"]) === 0);
expect(
  "hanging a rook in a lost position is a blunder, not 'excellent'",
  run("g1g4", ["g1f1", "f3e2", "f1a1"], ["f3g4", "g8f7", "g4f5"], MC.Excellent) === MC.Blunder,
);
expect(
  "when the best move loses the rook too, nothing changes",
  run("g1g4", ["g1g2", "f3g2", "g8f7", "g2f3"], ["f3g4", "g8f7", "g4f5"], MC.Excellent) === MC.Excellent,
);
expect(
  "a brilliant sacrifice is left alone",
  run("g1g4", ["g1f1", "f3e2", "f1a1"], ["f3g4", "g8f7", "g4f5"], MC.Splendid) === MC.Splendid,
);
// The case from a real game: in a lost position the engine mates instead of taking, but the rook still hangs.
const REAL = "4Q3/2R5/p4kr1/1p6/2p4p/5K2/PPP5/4R3 b - - 0 37";
const REAL_AFTER = "4Q3/2R5/p4k2/1p6/2p3rp/5K2/PPP5/4R3 w - - 1 38";
const real: PositionEval[] = [
  { lines: [line(["g6g3", "f3f2", "g3g2"], -3)], bestMove: "g6g3" },
  { lines: [line(["e8e6", "f6g5", "e1e5"], 2)], moveClassification: MC.Excellent },
];
expect("hanging the rook while the engine just mates is still a blunder", applyMaterialLoss(real, [REAL, REAL_AFTER], ["g6g4"])[1].moveClassification === MC.Blunder);
process.exit(failed ? 1 : 0);
