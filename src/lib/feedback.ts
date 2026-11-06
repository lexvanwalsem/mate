import { Chess } from "chess.js";
import { EnginePool } from "@/engine/pool";
import { PositionEval } from "@/types/eval";
import { Arrow, SquareMark } from "@/ui/Board";
import { uciMoveParams } from "./chess";
import { Key, t } from "./i18n";

/** What the app says back about a move you tried: words, arrows and marked squares. */
export interface MoveFeedback {
  correct: boolean;
  text: string;
  arrows: Arrow[];
  marks: SquareMark[];
}

const RED = "#e5384f"; // your move when it is wrong, and the square in danger
const ORANGE = "#ff8a1f"; // the reply that punishes it
const GREEN = "#22c58b"; // your move when it is right
const DEPTH = 12;
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

const cache = new Map<string, PositionEval>();
async function evalOf(pool: EnginePool, fen: string): Promise<PositionEval> {
  const hit = cache.get(fen);
  if (hit) return hit;
  const res = await pool.evaluate(fen, DEPTH);
  if (res.lines.length) cache.set(fen, res);
  return res;
}

const cpOf = (p: PositionEval): number | undefined => {
  const line = p.lines[0];
  if (!line) return undefined;
  if (line.mate !== undefined) return line.mate > 0 ? 1000 : -1000;
  return line.cp;
};

/** A correct move needs no engine: say what it does. */
function goodFeedback(game: Chess, san: string, from: string, to: string, captured?: string): MoveFeedback {
  const text = game.isCheckmate()
    ? t("feedback.mated", { san })
    : game.inCheck()
      ? t("feedback.check", { san })
      : captured
        ? t("feedback.wins", { san, piece: t(`piece.${captured}` as Key) })
        : t("feedback.good", { san });
  return { correct: true, text, arrows: [{ from, to, color: GREEN }], marks: [{ square: to, color: GREEN }] };
}

/** The move itself, drawn right away while the engine thinks about the answer. */
export function firstGlance(fenBefore: string, uci: string, correct: boolean): MoveFeedback {
  const game = new Chess(fenBefore);
  const m = game.move(uciMoveParams(uci));
  if (correct) return goodFeedback(game, m.san, m.from, m.to, m.captured);
  return { correct: false, text: t("feedback.checking"), arrows: [{ from: m.from, to: m.to, color: RED }], marks: [] };
}

/** Why a move is wrong: the engine's best reply, drawn and marked, and what it costs you. */
export async function explainWrong(pool: EnginePool, fenBefore: string, uci: string): Promise<MoveFeedback> {
  const game = new Chess(fenBefore);
  const moverWhite = game.turn() === "w";
  const m = game.move(uciMoveParams(uci));
  const fenAfter = game.fen();
  const arrows: Arrow[] = [{ from: m.from, to: m.to, color: RED }];
  const marks: SquareMark[] = [];

  if (game.isStalemate()) return { correct: false, text: t("feedback.stalemate", { san: m.san }), arrows, marks };

  const [before, after] = await Promise.all([evalOf(pool, fenBefore), evalOf(pool, fenAfter)]);
  const replyUci = after.lines[0]?.pv[0];
  let replySan = "";
  let captured: string | undefined;
  if (replyUci) {
    const g2 = new Chess(fenAfter);
    const r = g2.move(uciMoveParams(replyUci));
    replySan = r.san;
    captured = r.captured;
    arrows.push({ from: r.from, to: r.to, color: ORANGE });
    marks.push({ square: r.to, color: RED });
  }

  const mate = after.lines[0]?.mate;
  const allowsMate = mate !== undefined && ((moverWhite && mate < 0) || (!moverWhite && mate > 0));
  const cpBefore = cpOf(before);
  const cpAfter = cpOf(after);
  const lossPawns = cpBefore !== undefined && cpAfter !== undefined ? (moverWhite ? cpBefore - cpAfter : cpAfter - cpBefore) / 100 : 0;

  let text: string;
  if (allowsMate && replySan) text = t("feedback.mate", { san: m.san, reply: replySan });
  else if (captured && PIECE_VALUE[captured] >= 3 && replySan) text = t("feedback.loses", { san: m.san, reply: replySan, piece: t(`piece.${captured}` as Key) });
  else if (lossPawns >= 1 && replySan) text = t("feedback.slips", { san: m.san, pawns: lossPawns.toFixed(1), reply: replySan });
  else text = t("feedback.weak", { san: m.san });
  return { correct: false, text, arrows, marks };
}
