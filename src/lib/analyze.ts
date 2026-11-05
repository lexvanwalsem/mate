import { Chess } from "chess.js";
import { EnginePool } from "@/engine/pool";
import { Accuracy, EstimatedElo, PositionEval } from "@/types/eval";
import { MoveClassification as MC } from "@/types/enums";
import { getMovesClassification } from "@/engine/moveClassification";
import { computeAccuracy, getMovesAccuracy } from "@/engine/accuracy";
import { computeEstimatedElo } from "@/engine/estimateElo";
import { getPositionWinPercentage } from "@/engine/winPercentage";

export interface GameAnalysis {
  pgn: string;
  headers: Record<string, string>;
  fens: string[]; // n+1 positions
  uciMoves: string[];
  sans: string[];
  positions: PositionEval[];
  moveAccuracy: number[]; // per move
  accuracy: Accuracy;
  estimatedElo?: EstimatedElo;
  depth: number;
  multiPv: number;
}

export function parseGame(pgn: string) {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });
  const fens = history.map((m) => m.before);
  fens.push(history[history.length - 1].after);
  return {
    headers: chess.getHeaders() as Record<string, string>,
    fens,
    uciMoves: history.map((m) => m.from + m.to + (m.promotion || "")),
    sans: history.map((m) => m.san),
  };
}

// "Miss": the opponent erred, you were better, and you let the advantage slip.
function applyMisses(positions: PositionEval[]): PositionEval[] {
  const wp = positions.map(getPositionWinPercentage);
  return positions.map((p, i) => {
    if (i < 2) return p;
    const opp = positions[i - 1].moveClassification;
    const mine = p.moveClassification;
    if ((opp !== MC.Mistake && opp !== MC.Blunder) || (mine !== MC.Inaccuracy && mine !== MC.Mistake)) return p;
    const iAmWhite = (i - 1) % 2 === 0;
    const before = iAmWhite ? wp[i - 1] : 100 - wp[i - 1];
    return before < 60 ? p : { ...p, moveClassification: MC.Miss };
  });
}

export async function analyzeGame(
  pgn: string,
  opts: { depth: number; multiPv: number; onProgress?: (done: number, total: number) => void },
  pool: EnginePool
): Promise<GameAnalysis> {
  const parsed = parseGame(pgn);
  await pool.setMultiPv(opts.multiPv);

  const total = parsed.fens.length;
  let done = 0;
  const raw: PositionEval[] = new Array(total);

  await Promise.all(
    parsed.fens.map(async (fen, i) => {
      raw[i] = await pool.evaluate(fen, opts.depth);
      opts.onProgress?.(++done, total);
    })
  );

  const positions = applyMisses(getMovesClassification(raw, parsed.uciMoves, parsed.fens));
  const wp = positions.map(getPositionWinPercentage);

  return {
    pgn,
    headers: parsed.headers,
    fens: parsed.fens,
    uciMoves: parsed.uciMoves,
    sans: parsed.sans,
    positions,
    moveAccuracy: getMovesAccuracy(wp),
    accuracy: computeAccuracy(positions),
    estimatedElo: computeEstimatedElo(
      positions,
      Number(parsed.headers.WhiteElo) || undefined,
      Number(parsed.headers.BlackElo) || undefined
    ),
    depth: opts.depth,
    multiPv: opts.multiPv,
  };
}
