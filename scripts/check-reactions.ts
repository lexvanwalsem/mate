// Checks which Blokje pieces pull a face in a few positions. Usage: npx tsx scripts/check-reactions.ts
import { pieceMoods } from "../src/lib/reactions";
import { piecesFromFen } from "../src/ui/Board";

let failed = 0;
function check(label: string, fen: string, expected: Record<string, string>, capturedOn?: string, set = "blokje") {
  const pieces = piecesFromFen(fen);
  const moods = pieceMoods(pieces, set, capturedOn);
  const got: Record<string, string> = {};
  for (const p of pieces) {
    const m = moods.get(p.id);
    if (m) got[p.square] = m;
  }
  const ok = JSON.stringify(Object.entries(got).sort()) === JSON.stringify(Object.entries(expected).sort());
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${JSON.stringify(got)}`);
}

check("start position: nobody worries", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", {});
check("a free knight worries, the attacker does not", "4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1", { d5: "worried" });
check("pawns stay calm, even a loose one", "4k3/8/2p5/3p4/4P3/8/8/4K3 w - - 0 1", {});
check("a rook attacked by a pawn worries", "4k3/8/8/2p5/3R4/8/8/4K3 w - - 0 1", { d4: "worried" });
check("a king in check is shocked", "4k3/8/8/8/8/8/8/4K2r w - - 0 1", { e1: "shocked" });
check("the capturing piece is happy", "4k3/8/8/3N4/8/8/8/4K3 b - - 0 1", { d5: "happy" }, "d5");
check("off for other piece sets", "4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1", {}, undefined, "cburnett");
process.exit(failed ? 1 : 0);
