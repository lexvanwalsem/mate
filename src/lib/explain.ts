import { Chess, Square } from "chess.js";
import { GameAnalysis } from "./analyze";
import { MoveClassification as MC } from "@/types/enums";
import { Side, sideOfPosition } from "./stats";
import { uciMoveParams, uciToSan } from "./chess";
import { Key, t } from "./i18n";
import { commentFor } from "./commentary";

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

/**
 * What a move does, in one or two sentences, told to the player at the bottom of the board:
 * "you" for their own moves, "your opponent" for the other side. Like a coach next to the board.
 */
export function explainMove(a: GameAnalysis, p: number, persp: Side): string {
  const cls = a.positions[p]?.moveClassification;
  if (!cls) return "";
  if (cls === MC.Opening) return commentFor(a, p, persp);

  const mine = sideOfPosition(p) === persp;
  const voice = { S: t(mine ? "x.you" : "x.they"), P: t(mine ? "x.your" : "x.their") };
  const before = new Chess(a.fens[p - 1]);
  const wasCheck = before.inCheck();
  const board = new Chess(a.fens[p - 1]);
  const m = board.move(uciMoveParams(a.uciMoves[p - 1]));
  const enemy = m.color === "w" ? "b" : "w";
  const to = m.to as Square;
  const attackedBack = board.attackers(to, enemy).length > 0;
  const defended = board.attackers(to, m.color).length > 0;

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
  else main = quietMove(before, board, m, voice);
  if (board.isCheckmate()) return main;

  // What it leads to: for weak moves the engine's answer, for good moves a new threat.
  const extra: string[] = [];
  const bestUci = a.positions[p - 1].bestMove;
  const bestSan = bestUci && bestUci !== a.uciMoves[p - 1] ? uciToSan(a.fens[p - 1], bestUci) : undefined;
  if (BAD.includes(cls)) {
    const replyUci = a.positions[p].bestMove;
    const replyMate = a.positions[p].lines[0]?.mate;
    if (replyUci) {
      const g = new Chess(a.fens[p]);
      const r = g.move(uciMoveParams(replyUci));
      const mateAgainst = replyMate !== undefined && (m.color === "w" ? replyMate < 0 : replyMate > 0);
      const other = { O: t(mine ? "x.oppLower" : "x.youLower") };
      const chased = !r.captured && g.attackers(to, enemy).includes(r.to as Square) && VALUE[m.piece] > VALUE[r.piece];
      if (r.san.endsWith("#")) extra.push(t("x.allowsMateNow", { reply: r.san }));
      else if (mateAgainst) extra.push(t("x.allowsMate", { reply: r.san }));
      else if (r.captured) extra.push(t("x.allows", { reply: r.san, gain: t("x.a", { piece: piece(r.captured) }) }));
      else if (!defended && attackedBack && VALUE[m.piece] >= 3) extra.push(t("x.hanging", { mover: piece(m.piece), sq: m.to }));
      else if (chased) extra.push(t("x.chased", { ...other, reply: r.san, mover: piece(m.piece) }));
      else extra.push(t("x.allowsMove", { ...other, reply: r.san }));
    }
    if (bestSan) extra.push(t("x.better", { best: bestSan }));
  } else if (cls === MC.Miss && bestSan) {
    extra.push(t("x.missed", { ...voice, best: bestSan }));
  } else if (!m.captured) {
    // A new attack: the moved piece now hits something loose or worth more.
    const targets = board
      .board()
      .flat()
      .filter((s): s is NonNullable<typeof s> => !!s && s.color === enemy && s.type !== "k")
      .filter((s) => board.attackers(s.square, m.color).includes(to))
      .filter((s) => VALUE[s.type] > VALUE[m.piece] || board.attackers(s.square, enemy).length === 0)
      .sort((x, y) => VALUE[y.type] - VALUE[x.type]);
    if (targets[0]) extra.push(t("x.attack", { mover: piece(m.piece), piece: piece(targets[0].type), sq: targets[0].square }));
    else if (!defended && attackedBack && VALUE[m.piece] >= 3) extra.push(t("x.hanging", { mover: piece(m.piece), sq: m.to }));
  }
  return [main, ...extra].join(" ");
}
