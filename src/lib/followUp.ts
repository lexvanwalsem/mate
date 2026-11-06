import { Chess } from "chess.js";
import { EnginePool } from "@/engine/pool";
import { uciMoveParams } from "./chess";

/** One move played on the board: the position after it, its squares and its name. */
export interface PlayedStep {
  fen: string;
  from: string;
  to: string;
  san: string;
}

/** Plays uci moves one after another from a position; stops at the first one that does not fit. */
export function stepsFrom(fen: string, ucis: string[]): PlayedStep[] {
  const game = new Chess(fen);
  const out: PlayedStep[] = [];
  for (const uci of ucis) {
    try {
      const m = game.move(uciMoveParams(uci));
      out.push({ fen: game.fen(), from: m.from, to: m.to, san: m.san });
    } catch {
      break;
    }
  }
  return out;
}

/** The engine's best continuation from a position, a few half-moves long. */
export async function engineLine(pool: EnginePool, fen: string, plies = 4): Promise<string[]> {
  const res = await pool.evaluate(fen, 12);
  return res.lines[0]?.pv.slice(0, plies) ?? [];
}

/** Move numbers and names for a line, e.g. "12. Nf3 Kh8 13. Qh5". */
export function lineText(fen: string, steps: PlayedStep[]): string {
  const parts = fen.split(" ");
  let white = parts[1] === "w";
  let no = Number(parts[5]) || 1;
  return steps
    .map((s, i) => {
      const label = white ? `${no}. ${s.san}` : i === 0 ? `${no}... ${s.san}` : s.san;
      if (!white) no++;
      white = !white;
      return label;
    })
    .join(" ");
}
