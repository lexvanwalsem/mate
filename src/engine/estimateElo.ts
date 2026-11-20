// Based on Chesskit (https://github.com/GuillaumeSD/Chesskit), AGPL-3.0. Modified for Mate since November 2026.
import { ceilsNumber } from "@/lib/math";
import { EstimatedElo, PositionEval } from "@/types/eval";
import { MoveClassification as MC } from "@/types/enums";

// Rough rating estimate. The base is a folk heuristic, rating = 3100 * exp(-0.01 * average centipawn loss),
// from a Lichess forum thread. It is known to be unreliable, so we make it conservative:
//  - book and forced moves are ignored (they cost nothing and inflate the result),
//  - with a known rating the estimate stays close to it (at most 200 away),
//  - without one we pull towards a typical club rating, more so for short games.

const PRIOR_RATING = 1500;
const MAX_DEVIATION = 200;

const positionCp = (p: PositionEval): number => {
  const line = p.lines[0];
  if (line.cp !== undefined) return ceilsNumber(line.cp, -1000, 1000);
  if (line.mate !== undefined) return line.mate > 0 ? 1000 : -1000;
  return 0;
};

/** Average centipawn loss for one side, counting only moves that were really chosen. */
function averageCpl(positions: PositionEval[], side: "white" | "black"): { cpl: number; moves: number } {
  let total = 0;
  let moves = 0;
  for (let i = 1; i < positions.length; i++) {
    const whiteMoved = (i - 1) % 2 === 0;
    if (whiteMoved !== (side === "white")) continue;
    const cls = positions[i].moveClassification;
    if (cls === MC.Opening || cls === MC.Forced) continue;
    const before = positionCp(positions[i - 1]);
    const after = positionCp(positions[i]);
    total += Math.max(0, whiteMoved ? before - after : after - before);
    moves++;
  }
  return { cpl: moves ? total / moves : 0, moves };
}

function estimate(positions: PositionEval[], side: "white" | "black", rating?: number): number {
  const { cpl, moves } = averageCpl(positions, side);
  const raw = 3100 * Math.exp(-0.01 * cpl);
  let result: number;
  if (rating) {
    result = rating + ceilsNumber((raw - rating) * 0.4, -MAX_DEVIATION, MAX_DEVIATION);
  } else {
    const weight = Math.min(0.7, moves / 60);
    result = PRIOR_RATING * (1 - weight) + raw * weight;
  }
  return Math.round(ceilsNumber(result, 400, 2800) / 50) * 50;
}

export const computeEstimatedElo = (positions: PositionEval[], whiteElo?: number, blackElo?: number): EstimatedElo | undefined => {
  if (positions.length < 6) return undefined;
  return {
    white: estimate(positions, "white", whiteElo ?? blackElo),
    black: estimate(positions, "black", blackElo ?? whiteElo),
  };
};
