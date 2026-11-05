// Verifies every lesson position loads, every accepted move is legal and mate steps really mate.
import { Chess } from "chess.js";
import { UNITS } from "../src/lib/lessons";

let bad = 0;
for (const unit of UNITS) {
  for (const lesson of unit.lessons) {
    lesson.steps.forEach((s, i) => {
      const where = `${lesson.id}#${i + 1}`;
      try {
        const chess = new Chess(s.fen);
        if (s.kind !== "move") return;
        for (const uci of s.accept) {
          const c = new Chess(s.fen);
          const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
          if (s.mate && !c.isCheckmate()) throw new Error(`${uci} is not checkmate`);
          if (!m) throw new Error(`${uci} illegal`);
        }
        void chess;
      } catch (e) {
        bad++;
        console.log(`FAIL ${where}: ${(e as Error).message}`);
      }
    });
  }
}
console.log(bad ? `${bad} problems` : "all lessons ok");
process.exit(bad ? 1 : 0);
