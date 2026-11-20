import { Chess, Square } from "chess.js";
import { GameAnalysis } from "./analyze";
import { MoveClassification as MC } from "@/types/enums";
import { Side, sideOfPosition } from "./stats";
import { uciMoveParams, uciToSan } from "./chess";
import { Key, t } from "./i18n";
import { commentFor } from "./commentary";
import { lineText } from "./followUp";
import type { Arrow } from "@/ui/Board";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const BAD = [MC.Inaccuracy, MC.Mistake, MC.Blunder];
const piece = (type: string) => t(`piece.${type}` as Key);

/** A FEN with the other side to move, to count what a piece could do next. */
const turned = (fen: string) => {
  const f = fen.split(" ");
  f[1] = f[1] === "w" ? "b" : "w";
  f[3] = "-";
  return f.join(" ");
};
const reach = (fen: string, sq: string) => {
  try {
    return new Chess(fen).moves({ square: sq as Square }).length;
  } catch {
    return 0;
  }
};

/** A move without capture or check: say what it is for. */
function quietMove(before: Chess, board: Chess, m: ReturnType<Chess["move"]>, voice: Record<string, string>): string {
  const enemy = m.color === "w" ? "b" : "w";
  const v = { ...voice, piece: piece(m.piece) };
  const forward = m.color === "w" ? Number(m.to[1]) - Number(m.from[1]) : Number(m.from[1]) - Number(m.to[1]);
  // It was under attack and now it is not.
  if (m.piece !== "p" && before.attackers(m.from as Square, enemy).length && !board.attackers(m.to as Square, enemy).length) return t("x.safe", v);
  if (m.piece === "p") {
    const bishops = (b: Chess, fen: string) => b.findPiece({ type: "b", color: m.color }).reduce((n, sq) => n + reach(fen, sq), 0);
    const after = turned(board.fen());
    if (bishops(board, after) > bishops(before, before.fen())) return t("x.diagonal", v);
    const king = board.findPiece({ type: "k", color: m.color })[0];
    if (king && /[ah]/.test(m.to[0]) && Math.abs(king.charCodeAt(0) - m.to.charCodeAt(0)) <= 2 && forward === 1) return t("x.luft", v);
    const half = m.color === "w" ? Number(m.to[1]) >= 5 : Number(m.to[1]) <= 4;
    if (half) return t("x.space", v);
    return t("x.pawnMove", v);
  }
  if (m.piece === "r") {
    const file = m.to[0];
    const ownPawn = board.findPiece({ type: "p", color: m.color }).some((sq) => sq[0] === file);
    if (!ownPawn) return t("x.openFile", v);
    if (file === "d" || file === "e") return t("x.rookCenter", v);
  }
  if (m.piece === "q" && /[18]/.test(m.from[1])) return t("x.queenOut", v);
  const gain = reach(turned(board.fen()), m.to) - reach(before.fen(), m.from);
  if (gain >= 2) return t("x.improve", { ...v, n: reach(turned(board.fen()), m.to) });
  if (forward < 0) return t("x.regroup", v);
  return t("x.quiet", v);
}


/** The explanation of a move: the words, and the arrows that show them on the board. */
export interface Explanation {
  text: string;
  arrows: Arrow[];
}

const GREEN = "#22c58b"; // the better move
const ORANGE = "#ff8a1f"; // the answer that punishes
const YELLOW = "#f5c120"; // a new attack
const RED = "#e5384f"; // a piece that can be taken
const VIOLET = "#22b8b5"; // the plan, a few moves ahead
const arrow = (from: string, to: string, color: string): Arrow => ({ from, to, color });

/** White's material lead in a position, in pawns. */
const lead = (fen: string) => {
  let sum = 0;
  for (const ch of fen.split(" ")[0]) {
    const v = VALUE[ch.toLowerCase()];
    if (v && ch.toLowerCase() !== "k") sum += ch === ch.toUpperCase() ? v : -v;
  }
  return sum;
};

const gainText = (n: number) => t(n >= 8 ? "x.gain.q" : n >= 5 ? "x.gain.r" : n >= 3 ? "x.gain.piece" : n >= 2 ? "x.gain.pawns" : "x.gain.pawn", { n });

/**
 * The plan behind an engine line: plays it until the position is calm and looks at what comes out of it for `mover`:
 * checkmate, or material won. This is how the coach can say what the idea a few moves ahead is.
 */
function planOf(fen: string, pv: string[], mover: "w" | "b"): { mate: boolean; gain: number; line: string; arrows: Arrow[] } | undefined {
  const game = new Chess(fen);
  const steps: { san: string; from: string; to: string; color: string; captured?: string }[] = [];
  // Play on until things are calm: at least four half-moves, then stop at the first two moves without a capture,
  // so a line never ends in the middle of a trade.
  let calm = false;
  for (const uci of pv.slice(0, 10)) {
    try {
      const m = game.move(uciMoveParams(uci));
      steps.push(m);
      if (game.isCheckmate()) break;
      const prev = steps[steps.length - 2];
      if (steps.length >= 4 && !m.captured && prev && !prev.captured) {
        calm = true;
        break;
      }
    } catch {
      break;
    }
  }
  if (!steps.length || (!calm && !game.isCheckmate())) return undefined;
  const mate = game.isCheckmate() && steps[steps.length - 1].color === mover;
  const gain = (lead(game.fen()) - lead(fen)) * (mover === "w" ? 1 : -1);
  const arrows = steps.filter((m) => m.color === mover).slice(0, 3).map((m) => arrow(m.from, m.to, VIOLET));
  return { mate, gain, line: lineText(fen, steps as never), arrows };
}

/**
 * What a move does, in one or two sentences, told to the player at the bottom of the board:
 * "you" for their own moves, "your opponent" for the other side. Like a coach next to the board.
 * Every claim that is about a square comes with an arrow on the board.
 */
export function explainMove(a: GameAnalysis, p: number, persp: Side): Explanation {
  const cls = a.positions[p]?.moveClassification;
  if (!cls) return { text: "", arrows: [] };
  if (cls === MC.Opening) return { text: commentFor(a, p, persp), arrows: [] };

  const mine = sideOfPosition(p) === persp;
  const me = mine ? "me" : "opp";
  const voice = { S: t(mine ? "x.you" : "x.they"), P: t(mine ? "x.your" : "x.their") };
  const before = new Chess(a.fens[p - 1]);
  const wasCheck = before.inCheck();
  const board = new Chess(a.fens[p - 1]);
  const m = board.move(uciMoveParams(a.uciMoves[p - 1]));
  const enemy = m.color === "w" ? "b" : "w";
  const to = m.to as Square;
  const attackedBack = board.attackers(to, enemy).length > 0;
  const defended = board.attackers(to, m.color).length > 0;
  const arrows: Arrow[] = [];

  // What the move itself does.
  let main: string;
  if (board.isCheckmate()) main = t("x.mate", voice);
  else if (m.san.startsWith("O-O")) main = t("x.castle", voice);
  else if (m.promotion) main = t("x.promote", { ...voice, piece: piece(m.promotion) });
  else if (wasCheck && m.piece === "k") main = t("x.escape", voice);
  else if (wasCheck && !m.captured) main = t("x.block", { ...voice, piece: piece(m.piece) });
  else if (m.captured && p > 1 && a.sans[p - 2].includes("x") && a.uciMoves[p - 2].slice(2, 4) === m.to) main = t("x.recapture", { ...voice, piece: piece(m.captured) });
  else if (m.captured) main = t(!attackedBack ? "x.takeFree" : VALUE[m.captured] >= VALUE[m.piece] ? "x.trade" : "x.takeRisk", { ...voice, piece: piece(m.captured), mover: piece(m.piece) });
  else if (board.inCheck()) main = t("x.check", { ...voice, piece: piece(m.piece) });
  else if ((m.piece === "n" || m.piece === "b") && /[18]/.test(m.from[1]) && p <= 24) main = t("x.develop", { ...voice, piece: piece(m.piece) });
  else if (m.piece === "p" && ["d4", "e4", "d5", "e5"].includes(m.to) && p <= 16) main = t("x.center", voice);
  // A weak quiet move gets a plain description, not praise like "where it is strongest".
  else main = BAD.includes(cls) ? t("x.moved", { ...voice, piece: piece(m.piece), sq: m.to }) : quietMove(before, board, m, voice);
  if (board.isCheckmate()) return { text: main, arrows };

  // What it leads to: for weak moves the engine's answer, for good moves the threat or the plan.
  const extra: string[] = [];
  const bestUci = a.positions[p - 1].bestMove;
  const bestSan = bestUci && bestUci !== a.uciMoves[p - 1] ? uciToSan(a.fens[p - 1], bestUci) : undefined;
  if (BAD.includes(cls)) {
    const replyUci = a.positions[p].bestMove;
    const replyMate = a.positions[p].lines[0]?.mate;
    if (replyUci) {
      const g = new Chess(a.fens[p]);
      const r = g.move(uciMoveParams(replyUci));
      arrows.push(arrow(r.from, r.to, ORANGE));
      const mateAgainst = replyMate !== undefined && (m.color === "w" ? replyMate < 0 : replyMate > 0);
      const other = { O: t(mine ? "x.oppLower" : "x.youLower") };
      const chased = !r.captured && g.attackers(to, enemy).includes(r.to as Square) && VALUE[m.piece] > VALUE[r.piece];
      if (r.san.endsWith("#")) extra.push(t("x.allowsMateNow", { reply: r.san }));
      else if (mateAgainst) extra.push(t("x.allowsMate", { reply: r.san }));
      else if (r.captured) extra.push(t("x.allows", { reply: r.san, gain: t("x.a", { piece: piece(r.captured) }) }));
      else if (!defended && attackedBack && VALUE[m.piece] >= 3) extra.push(t("x.hanging", { mover: piece(m.piece), sq: m.to }));
      else if (chased) extra.push(t("x.chased", { ...other, reply: r.san, mover: piece(m.piece) }));
      else extra.push(t("x.allowsMove", { ...other, reply: r.san }));
      // The engine may prefer something else (like a mate), but a piece left hanging is still worth saying.
      const loose = !defended && attackedBack && VALUE[m.piece] >= 3 && !r.captured;
      if (loose && !extra.some((e) => e === t("x.hanging", { mover: piece(m.piece), sq: m.to }))) {
        extra.push(t("x.hanging", { mover: piece(m.piece), sq: m.to }));
        const hitter = board.attackers(to, enemy)[0];
        if (hitter) arrows.push(arrow(hitter, m.to, RED));
      }
    }
    if (bestSan && bestUci) {
      extra.push(t("x.better", { best: bestSan }));
      arrows.push(arrow(bestUci.slice(0, 2), bestUci.slice(2, 4), GREEN));
    }
  } else if (cls === MC.Miss && bestSan && bestUci) {
    arrows.push(arrow(bestUci.slice(0, 2), bestUci.slice(2, 4), GREEN));
    const plan = planOf(a.fens[p - 1], a.positions[p - 1].lines[0]?.pv ?? [], m.color);
    if (plan && (plan.mate || plan.gain >= 1)) {
      extra.push(t(plan.mate ? `x.missedMate.${me}` : `x.missedPlan.${me}`, { best: bestSan, line: plan.line, gain: gainText(plan.gain) }));
      arrows.push(...plan.arrows.slice(1));
    } else extra.push(t("x.missed", { ...voice, best: bestSan }));
  } else {
    // A new attack: the moved piece now hits something loose or worth more.
    const targets = m.captured
      ? []
      : board
          .board()
          .flat()
          .filter((s): s is NonNullable<typeof s> => !!s && s.color === enemy && s.type !== "k")
          .filter((s) => board.attackers(s.square, m.color).includes(to))
          .filter((s) => VALUE[s.type] > VALUE[m.piece] || board.attackers(s.square, enemy).length === 0)
          .sort((x, y) => VALUE[y.type] - VALUE[x.type]);
    // A fine move that was not the best: still show the best one, in words and as a green arrow.
    if (bestSan && bestUci && (cls === MC.Okay || cls === MC.Excellent)) {
      extra.push(t("x.bestWas", { best: bestSan }));
      arrows.push(arrow(bestUci.slice(0, 2), bestUci.slice(2, 4), GREEN));
    }
    // The plan: what the engine expects a few moves ahead, when it wins something for the mover.
    const plan = planOf(a.fens[p], a.positions[p].lines[0]?.pv ?? [], m.color);
    if (plan && (plan.mate || plan.gain >= 2)) {
      extra.push(t(plan.mate ? `x.planMate.${me}` : `x.planWin.${me}`, { line: plan.line, gain: gainText(plan.gain) }));
      arrows.push(...plan.arrows);
    } else if (targets[0]) {
      extra.push(t("x.attack", { mover: piece(m.piece), piece: piece(targets[0].type), sq: targets[0].square }));
      arrows.push(arrow(m.to, targets[0].square, YELLOW));
    } else if (!defended && attackedBack && VALUE[m.piece] >= 3) {
      extra.push(t("x.hanging", { mover: piece(m.piece), sq: m.to }));
      const hitter = board.attackers(to, enemy)[0];
      if (hitter) arrows.push(arrow(hitter, m.to, RED));
    }
  }
  // Already decided before this move: say so, it changes what the move means.
  const mateBefore = a.positions[p - 1].lines[0]?.mate;
  if (mateBefore !== undefined && mateBefore !== 0) {
    const forMover = (mateBefore > 0) === (m.color === "w");
    extra.push(t(`x.${forMover ? "wonAnyway" : "lostAnyway"}.${me}` as Key, { n: Math.abs(mateBefore) }));
  }
  return { text: [main, ...extra].join(" "), arrows };
}
