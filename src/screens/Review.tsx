import { useEffect, useMemo, useState } from "react";
import { Chess, Square } from "chess.js";
import Board, { Arrow, BoardPiece, buildFrames, piecesFromFen } from "@/ui/Board";
import { EvalBar, EvalGraph } from "@/ui/Charts";
import ClassBadge from "@/ui/ClassBadge";
import PlayerBar from "@/ui/PlayerBar";
import Mascot from "@/ui/Mascot";
import { CLASS_META, Mood, classLabel } from "@/ui/classes";
import { GameAnalysis } from "@/lib/analyze";
import { Side, sideOfPosition } from "@/lib/stats";
import { commentFor } from "@/lib/commentary";
import { t } from "@/lib/i18n";
import { getEvaluationBar, getLineEvalLabel, moveLineUciToSan } from "@/lib/chess";
import { getLineWinPercentage } from "@/engine/winPercentage";
import { MoveClassification as MC } from "@/types/enums";

interface Props {
  a: GameAnalysis;
  side: Side;
  pieceSet: string;
  start: number;
  onBack: () => void;
}

const RETRY_CLASSES = [MC.Inaccuracy, MC.Mistake, MC.Miss, MC.Blunder];

export default function Review({ a, side, pieceSet, start, onBack }: Props) {
  const [pos, setPos] = useState(start);
  const [flipped, setFlipped] = useState(false);
  const [retry, setRetry] = useState<{ selected?: string; result?: "right" | "wrong" } | null>(null);

  const frames = useMemo(() => buildFrames(a.fens[0], a.uciMoves), [a]);
  const last = a.positions.length - 1;
  const orientation: Side = flipped ? (side === "white" ? "black" : "white") : side;
  const goto = (p: number) => {
    setRetry(null);
    setPos(Math.max(0, Math.min(last, p)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goto(pos - 1);
      if (e.key === "ArrowRight") goto(pos + 1);
      if (e.key === "Home") goto(0);
      if (e.key === "End") goto(last);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cls = a.positions[pos].moveClassification;
  const mine = pos > 0 && sideOfPosition(pos) === side;
  const canRetry = mine && cls !== undefined && RETRY_CLASSES.includes(cls);
  const mood: Mood = retry?.result === "right" ? "happy" : retry?.result === "wrong" ? "worried" : cls ? (mine ? CLASS_META[cls].mood : "idle") : "happy";

  const uci = pos > 0 ? a.uciMoves[pos - 1] : undefined;
  const lastMove = uci ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : undefined;

  // Retry mode shows the position before the move and accepts clicks.
  const retryChess = useMemo(() => (retry ? new Chess(a.fens[pos - 1]) : null), [retry !== null, pos, a]);
  const targets: string[] = retry?.selected && retryChess
    ? retryChess.moves({ square: retry.selected as Square, verbose: true }).map((m) => m.to)
    : [];

  const onSquareClick = (sq: string) => {
    if (!retry || !retryChess || retry.result) return;
    const piece = retryChess.get(sq as Square);
    if (retry.selected && (targets as string[]).includes(sq)) {
      const move = retryChess.moves({ square: retry.selected as Square, verbose: true }).find((m) => m.to === sq)!;
      const tried = move.from + move.to + (move.promotion ?? "");
      setRetry({ selected: undefined, result: isGoodAlternative(a, pos, tried, side) ? "right" : "wrong" });
    } else if (piece && piece.color === retryChess.turn()) {
      setRetry({ selected: sq });
    } else {
      setRetry({});
    }
  };

  const bestUci = a.positions[pos - 1]?.bestMove;
  const arrows: Arrow[] = [];
  if (!retry && pos > 0 && bestUci && bestUci !== uci && cls && RETRY_CLASSES.includes(cls)) {
    arrows.push({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), color: "#22c58b" });
  }

  const pieces: BoardPiece[] = retry ? piecesFromFen(a.fens[pos - 1]) : frames[pos];
  const bar = getEvaluationBar(a.positions[pos]);
  const lines = a.positions[pos].lines;

  return (
    <div className="screen review">
      <div className="board-col">
        <PlayerBar headers={a.headers} color={orientation === "white" ? "black" : "white"} isYou={(orientation === "white" ? "black" : "white") === side} accuracy={a.accuracy[orientation === "white" ? "black" : "white"]} />
        <div className="board-row">
          <EvalBar whitePct={bar.whitePct} label={bar.label} side={orientation} />
          <Board
            pieces={pieces}
            orientation={orientation}
            pieceSet={pieceSet}
            lastMove={retry ? undefined : lastMove}
            highlight={cls ? CLASS_META[cls].color : undefined}
            badge={!retry && lastMove && cls ? { square: lastMove.to, cls } : undefined}
            arrows={arrows}
            selected={retry?.selected}
            targets={targets}
            onSquareClick={onSquareClick}
          />
        </div>
        <PlayerBar headers={a.headers} color={orientation} isYou={orientation === side} accuracy={a.accuracy[orientation]} />
        <div className="controls">
          <button onClick={() => goto(0)} aria-label="First">|&lt;</button>
          <button onClick={() => goto(pos - 1)} aria-label="Previous">&lt;</button>
          <button onClick={() => goto(pos + 1)} aria-label="Next">&gt;</button>
          <button onClick={() => goto(last)} aria-label="Last">&gt;|</button>
          <button onClick={() => setFlipped(!flipped)}>{t("review.flip")}</button>
        </div>
      </div>

      <div className="side-col">
        <div className="card coach">
          <Mascot mood={mood} size={96} />
          <div className="bubble">
            {retry ? (
              <p>
                {retry.result === "right" && t("review.right")}
                {retry.result === "wrong" && t("review.wrong")}
                {!retry.result && t("review.ask")}
              </p>
            ) : pos === 0 ? (
              <p>{t("review.start")}</p>
            ) : (
              <>
                {cls && (
                  <div className="bubble-title">
                    <ClassBadge cls={cls} size={22} /> {classLabel(cls)}
                  </div>
                )}
                <p>{commentFor(a, pos, side)}</p>
              </>
            )}
            {canRetry && !retry && <button className="btn primary small" onClick={() => setRetry({})}>{t("review.retry")}</button>}
            {retry && (
              <div className="row">
                {retry.result === "wrong" && <button className="btn ghost small" onClick={() => setRetry({})}>{t("review.again")}</button>}
                <button className="btn ghost small" onClick={() => setRetry(null)}>{t("review.stop")}</button>
              </div>
            )}
          </div>
        </div>

        <div className="card graph-card">
          <EvalGraph a={a} side={side} current={pos} onSelect={goto} />
        </div>

        {!retry && lines.length > 0 && (
          <div className="card lines">
            <h3>{t("review.lines")}</h3>
            {lines.map((l) => (
              <div key={l.multiPv} className="line">
                <b>{getLineEvalLabel(l)}</b>
                <span>{lineToSan(a.fens[pos], l.pv.slice(0, 6))}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card movelist">
          {Array.from({ length: Math.ceil(a.sans.length / 2) }, (_, i) => (
            <div className="move-row" key={i}>
              <span className="move-no">{i + 1}.</span>
              {[i * 2 + 1, i * 2 + 2].map((p) =>
                p <= a.sans.length ? (
                  <button key={p} className={`move ${p === pos ? "current" : ""}`} onClick={() => goto(p)}>
                    {a.positions[p].moveClassification && <ClassBadge cls={a.positions[p].moveClassification!} size={16} />}
                    {a.sans[p - 1]}
                  </button>
                ) : (
                  <span key={p} />
                )
              )}
            </div>
          ))}
        </div>
        <button className="btn ghost" onClick={onBack}>{t("review.back")}</button>
      </div>
    </div>
  );
}

function lineToSan(fen: string, pv: string[]): string {
  const conv = moveLineUciToSan(fen);
  return pv.map(conv).join(" ");
}

/** A retry move counts when it is the best move or a top line within 3 win-percent of the best. */
function isGoodAlternative(a: GameAnalysis, pos: number, tried: string, side: Side): boolean {
  const lines = a.positions[pos - 1].lines;
  if (!lines.length) return false;
  const wp = (l: (typeof lines)[number]) => (side === "white" ? getLineWinPercentage(l) : 100 - getLineWinPercentage(l));
  const best = Math.max(...lines.map(wp));
  return lines.some((l) => l.pv[0] === tried && wp(l) >= best - 3);
}
