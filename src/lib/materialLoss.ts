import { Chess, Square } from "chess.js";
import { PositionEval } from "@/types/eval";
import { MoveClassification as MC } from "@/types/enums";
import { uciMoveParams } from "./chess";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** White's material lead, in pawns. */
function lead(fen: string): number {
  let sum = 0;
  for (const ch of fen.split(" ")[0]) {
    const v = VALUE[ch.toLowerCase()];
    if (v) sum += ch === ch.toUpperCase() ? v : -v;
  }
  return sum;
}

/**
 * Plays a line until the position is calm (at least the move and its answer, then two half-moves in a row
 * without a capture, at most ten) and returns white's material lead there. So a trade in progress is never counted halfway.
 */
export function calmLead(fen: string, ucis: string[]): number {
  const game = new Chess(fen);
  const caps: boolean[] = [];
  for (const uci of ucis.slice(0, 10)) {
    try {
      caps.push(!!game.move(uciMoveParams(uci)).captured);
    } catch {
      break;
    }
    const n = caps.length;
    if (n >= 2 && !caps[n - 1] && !caps[n - 2]) break;
  }
  return lead(game.fen());
}

/**
 * The most the side that just moved can lose right away: a piece that is attacked and not defended loses
 * its full value, a defended piece attacked by something cheaper loses the difference.
 */
export function hanging(fen: string): number {
  const board = new Chess(fen);
  const them = board.turn();
  const us = them === "w" ? "b" : "w";
  let worst = 0;
  for (const s of board.board().flat()) {
    if (!s || s.color !== us || s.type === "k") continue;
    const attackers = board.attackers(s.square as Square, them);
    if (!attackers.length) continue;
    const cheapest = Math.min(...attackers.map((sq) => VALUE[board.get(sq as Square)?.type ?? "q"] || 100));
    const defended = board.attackers(s.square as Square, us).length > 0;
    const loss = defended ? VALUE[s.type] - cheapest : VALUE[s.type];
    worst = Math.max(worst, loss);
  }
  return worst;
}

/** Position after a move and what it captured, in pawns. */
const after = (fen: string, uci: string) => {
  const g = new Chess(fen);
  const m = g.move(uciMoveParams(uci));
  return { fen: g.fen(), took: m.captured ? VALUE[m.captured] : 0 };
};

// Moves that are meant to give material away, or that are already the engine's choice: never touched.
const KEEP = [MC.Splendid, MC.Perfect, MC.Best, MC.Opening, MC.Forced, MC.Blunder];

/**
 * The win-percentage classification cannot see material lost in a position that is already decided:
 * being mated in five or in two is "0%" either way, so hanging a rook there looks fine. But the opponent
 * can still miss the mate. This second check compares the played move with the best move twice:
 * what can be taken right away, and the material once the engine lines are played out until calm.
 * A piece or more lost on top of the best move makes it a mistake, a rook or more a blunder.
 */
export function applyMaterialLoss(positions: PositionEval[], fens: string[], uciMoves: string[]): PositionEval[] {
  return positions.map((p, i) => {
    if (i < 1 || !p.moveClassification || KEEP.includes(p.moveClassification)) return p;
    const before = positions[i - 1];
    const played = uciMoves[i - 1];
    const bestLine = before.lines[0]?.pv ?? [];
    const best = bestLine[0] ?? before.bestMove;
    if (!best || best === played) return p;
    const moverWhite = fens[i - 1].split(" ")[1] === "w";
    const sign = moverWhite ? 1 : -1;
    // In a decided position (mate in sight or a big lead) the evaluation cannot show a hung piece, so look at
    // what can be taken right away. In other positions the engine already sees it, and a "hanging" piece is often bait.
    const decided = [before.lines[0], p.lines[0]].some((l) => l && (l.mate !== undefined || Math.abs(l.cp ?? 0) >= 700));
    let hangLoss = 0;
    if (decided) {
      try {
        const mine = after(fens[i - 1], played);
        const top = after(fens[i - 1], best);
        hangLoss = hanging(mine.fen) - mine.took - (hanging(top.fen) - top.took);
      } catch {
        hangLoss = 0;
      }
    }
    const lineLoss = bestLine.length ? (calmLead(fens[i - 1], bestLine) - calmLead(fens[i - 1], [played, ...(p.lines[0]?.pv ?? [])])) * sign : 0;
    const lost = Math.max(hangLoss, lineLoss);
    if (lost >= 5) return { ...p, moveClassification: MC.Blunder };
    if (lost >= 3 && p.moveClassification !== MC.Mistake) return { ...p, moveClassification: MC.Mistake };
    return p;
  });
}
