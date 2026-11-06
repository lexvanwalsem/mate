import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, Square } from "chess.js";
import Board, { Arrow, BoardPiece, buildFrames, piecesFromFen } from "@/ui/Board";
import { EvalBar, EvalGraph } from "@/ui/Charts";
import ClassBadge from "@/ui/ClassBadge";
import PlayerBar from "@/ui/PlayerBar";
import Mascot from "@/ui/Mascot";
import { CLASS_META, Mood, classLabel } from "@/ui/classes";
import { GameAnalysis } from "@/lib/analyze";
import { Side, sideOfPosition, winPctFor } from "@/lib/stats";
import { commentFor, lineComment } from "@/lib/commentary";
import { t } from "@/lib/i18n";
import { getEvaluationBar, getLineEvalLabel, moveLineUciToSan, uciToSan } from "@/lib/chess";
import { isGoodMove, practiceAt } from "@/lib/practice";
import { Variation, classifyTried, lineText, replay, withTurn } from "@/lib/variation";
import { EnginePool } from "@/engine/pool";
import { PositionEval } from "@/types/eval";
import { MoveClassification as MC } from "@/types/enums";

interface Props {
  a: GameAnalysis;
  side: Side;
  pieceSet: string;
  start: number;
  getPool: () => Promise<EnginePool>;
  onBack: () => void;
}

// Show the better move as an arrow for any move that was not the best.
const SHOW_BEST = [MC.Okay, MC.Inaccuracy, MC.Mistake, MC.Miss, MC.Blunder];

const effectFor = (cls?: MC): "great" | "good" | "bad" | undefined =>
  cls === MC.Splendid || cls === MC.Perfect ? "great" : cls === MC.Best || cls === MC.Excellent ? "good" : cls === MC.Mistake || cls === MC.Blunder || cls === MC.Miss ? "bad" : undefined;

const TOUR_MS = 5500;
const TOUR_MAX = 8;

const toUci = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? "");

export default function Review({ a, side, pieceSet, start, getPool, onBack }: Props) {
  const [pos, setPos] = useState(start);
  const [flipped, setFlipped] = useState(false);
  const [retry, setRetry] = useState<{ selected?: string; result?: "right" | "wrong" } | null>(null);
  const [variation, setVariation] = useState<Variation | null>(null);
  const [selected, setSelected] = useState<string>();
  const [live, setLive] = useState<PositionEval>();
  const [tour, setTour] = useState<{ list: number[]; i: number } | null>(null);

  // Every position of the game already has an engine evaluation; tries from the board add to this cache.
  const cache = useRef(new Map<string, PositionEval>());
  useMemo(() => {
    a.fens.forEach((fen, i) => cache.current.set(fen, a.positions[i]));
  }, [a]);

  const frames = useMemo(() => buildFrames(a.fens[0], a.uciMoves), [a]);
  const last = a.positions.length - 1;
  const orientation: Side = flipped ? (side === "white" ? "black" : "white") : side;

  const showPos = (p: number) => {
    setRetry(null);
    setVariation(null);
    setSelected(undefined);
    setPos(Math.max(0, Math.min(last, p)));
  };
  const goto = (p: number) => {
    setTour(null);
    showPos(p);
  };

  // ---- walkthrough: plays through the biggest moments of the game, one every few seconds ----
  const startTour = () => {
    const moments: { p: number; swing: number }[] = [];
    for (let p = 1; p <= last; p++) {
      const c = a.positions[p].moveClassification;
      if (c !== MC.Splendid && c !== MC.Perfect && c !== MC.Blunder && c !== MC.Mistake && c !== MC.Miss) continue;
      const mover = sideOfPosition(p);
      moments.push({ p, swing: Math.abs(winPctFor(a, p, mover) - winPctFor(a, p - 1, mover)) });
    }
    const list = moments.sort((x, y) => y.swing - x.swing).slice(0, TOUR_MAX).map((m) => m.p).sort((x, y) => x - y);
    if (!list.length) return;
    setTour({ list, i: 0 });
    showPos(list[0]);
  };
  useEffect(() => {
    if (!tour) return;
    const id = window.setTimeout(() => {
      if (tour.i + 1 < tour.list.length) {
        setTour({ ...tour, i: tour.i + 1 });
        showPos(tour.list[tour.i + 1]);
      } else {
        setTour(null);
      }
    }, TOUR_MS);
    return () => window.clearTimeout(id);
  }, [tour]);

  // keep the current move in view in the move list
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".movelist .move.current");
    const box = el?.closest<HTMLElement>(".movelist");
    if (el && box) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2, behavior: "smooth" });
  }, [pos, variation?.base]);

  // ---- your own line ----
  const vdata = useMemo(() => (variation ? replay(a.fens[variation.base], variation.moves) : null), [variation?.base, variation?.moves, a]);
  const vfen = variation && vdata ? vdata.fens[Math.min(variation.idx, vdata.fens.length - 1)] : undefined;
  const vframes = useMemo(() => (variation && vdata ? buildFrames(a.fens[variation.base], vdata.ucis) : null), [vdata, variation?.base]);

  useEffect(() => {
    if (!vfen) {
      setLive(undefined);
      return;
    }
    const hit = cache.current.get(vfen);
    if (hit) {
      setLive(hit);
      return;
    }
    let stale = false;
    setLive(undefined);
    (async () => {
      const pool = await getPool();
      if (stale) return;
      const res = await pool.evaluate(
        vfen,
        a.depth,
        (e) => {
          if (!stale && e.lines.length) setLive(e);
        },
        true
      );
      if (stale || !res.lines.length) return;
      cache.current.set(vfen, res);
      setLive(res);
    })();
    return () => {
      stale = true;
    };
  }, [vfen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") variation ? stepBack() : goto(pos - 1);
      if (e.key === "ArrowRight") variation ? stepForward() : goto(pos + 1);
      if (e.key === "Home") variation ? goto(variation.base) : goto(0);
      if (e.key === "End") goto(last);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stepBack = () => {
    if (!variation) return;
    if (variation.idx > 1) setVariation({ ...variation, idx: variation.idx - 1 });
    else goto(variation.base);
  };
  const stepForward = () => {
    if (variation && vdata && variation.idx < vdata.ucis.length) setVariation({ ...variation, idx: variation.idx + 1 });
  };
  const undo = () => {
    if (!variation) return;
    const moves = variation.moves.slice(0, variation.idx - 1);
    if (!moves.length) goto(variation.base);
    else setVariation({ ...variation, moves, idx: moves.length });
  };

  // ---- what is on the board ----
  const practice = !variation && pos > 0 ? practiceAt(a, pos, side) : undefined;
  const cls = variation ? undefined : a.positions[pos].moveClassification;
  const mine = !variation && pos > 0 && sideOfPosition(pos) === side;

  const vIdx = variation?.idx ?? 0;
  const prevEval = variation && vdata ? cache.current.get(vdata.fens[vIdx - 1]) : undefined;
  const nowEval = variation && vfen ? cache.current.get(vfen) ?? live : undefined;
  const moverWhite = variation && vdata ? vdata.movers[vIdx - 1] === "w" : true;
  // A move made out of turn has no engine verdict: the engine evaluated the other side to move.
  const outOfTurn = !!(variation && vdata && vIdx > 0 && vdata.fens[vIdx - 1].split(" ")[1] !== vdata.movers[vIdx - 1]);
  const vcls = variation && vIdx > 0 && prevEval && nowEval && !outOfTurn ? classifyTried(prevEval, nowEval, vdata!.ucis[vIdx - 1], moverWhite) : undefined;

  const shownCls = variation ? vcls : cls;
  const uci = variation ? (vIdx > 0 ? vdata?.ucis[vIdx - 1] : undefined) : pos > 0 ? a.uciMoves[pos - 1] : undefined;
  const lastMove = uci ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : undefined;

  const playFen = variation && vfen ? vfen : a.fens[pos];
  const exploreChess = useMemo(() => new Chess(retry && practice ? practice.fen : playFen), [playFen, retry !== null, practice?.fen]);
  const activeSel = retry ? retry.selected : selected;
  // Practice follows the real turn. Your own lines are free: any piece can move, also twice in a row.
  const legalFrom = (sq: string) => {
    const piece = exploreChess.get(sq as Square);
    if (!piece) return [];
    if (retry || piece.color === exploreChess.turn()) return exploreChess.moves({ square: sq as Square, verbose: true });
    return withTurn(playFen, piece.color).moves({ square: sq as Square, verbose: true });
  };
  const targets: string[] = activeSel ? legalFrom(activeSel).map((m) => m.to) : [];

  const submitRetry = (tried: string) => {
    if (practice) setRetry({ selected: undefined, result: isGoodMove(practice, tried) ? "right" : "wrong" });
  };

  // A move from the board: while practicing it is answered, otherwise it starts or extends your own line.
  const playMove = (from: string, to: string) => {
    const hit = legalFrom(from).find((m) => m.to === to);
    if (!hit) return;
    commit(toUci(hit));
  };

  const commit = (move: string) => {
    if (retry) return submitRetry(move);
    setSelected(undefined);
    if (!variation) {
      if (move === a.uciMoves[pos]) return goto(pos + 1);
      setVariation({ base: pos, moves: [move], idx: 1 });
      return;
    }
    const kept = variation.moves.slice(0, variation.idx);
    if (variation.moves[variation.idx] === move) setVariation({ ...variation, idx: variation.idx + 1 });
    else setVariation({ ...variation, moves: [...kept, move], idx: kept.length + 1 });
  };

  const onSquareClick = (sq: string) => {
    if (retry?.result) return;
    const sel = activeSel;
    if (sel && targets.includes(sq)) return playMove(sel, sq);
    const piece = exploreChess.get(sq as Square);
    const pick = piece && (!retry || piece.color === exploreChess.turn()) ? sq : undefined;
    if (retry) setRetry({ selected: pick });
    else setSelected(pick);
  };

  const canDrag = (sq: string) => {
    if (retry?.result) return false;
    const piece = exploreChess.get(sq as Square);
    return !!piece && (!retry || piece.color === exploreChess.turn());
  };
  const onDragStart = (sq: string) => (retry ? setRetry({ selected: sq }) : setSelected(sq));
  const onDragMove = (from: string, to: string) => playMove(from, to);

  // ---- arrows, pieces, eval ----
  const arrows: Arrow[] = [];
  if (variation) {
    if (vcls && SHOW_BEST.includes(vcls) && prevEval?.bestMove) arrows.push({ from: prevEval.bestMove.slice(0, 2), to: prevEval.bestMove.slice(2, 4), color: "#22c58b" });
  } else if (!retry && mine && pos > 0) {
    const best = a.positions[pos - 1]?.bestMove;
    if (best && best !== uci && cls && SHOW_BEST.includes(cls)) arrows.push({ from: best.slice(0, 2), to: best.slice(2, 4), color: "#22c58b" });
  }

  const frame: BoardPiece[] = variation && vframes ? vframes[Math.min(vIdx, vframes.length - 1)] : frames[pos];
  const pieces: BoardPiece[] = retry && practice ? piecesFromFen(practice.fen) : frame;
  const framePrev = variation ? vframes?.[Math.min(vIdx, vframes.length - 1) - 1] : pos > 0 ? frames[pos - 1] : undefined;
  const captured = !retry && framePrev ? framePrev.find((p) => !frame.some((q) => q.id === p.id)) : undefined;

  const shownEval: PositionEval = variation ? nowEval ?? prevEval ?? a.positions[variation.base] : a.positions[pos];
  const bar = getEvaluationBar(shownEval);
  const lines = shownEval.lines;
  const linesFen = variation && vfen ? (nowEval ? vfen : vdata!.fens[Math.max(0, vIdx - 1)]) : a.fens[pos];
  const thinking = !!variation && !cache.current.has(vfen ?? "") && !live;

  const mood: Mood = retry?.result === "right" ? "cheer" : retry?.result === "wrong" ? "worried" : variation ? (vcls ? CLASS_META[vcls].mood : "thinking") : cls ? (mine ? CLASS_META[cls].mood : "idle") : "happy";

  const engineMove = variation && !thinking ? nowEval?.lines[0]?.pv[0] ?? nowEval?.bestMove : undefined;
  const lastSan = variation && vdata && vIdx > 0 ? vdata.sans[vIdx - 1] : undefined;
  const betterSan = vcls && vcls !== MC.Best && prevEval?.bestMove && variation && vdata ? uciToSan(vdata.fens[vIdx - 1], prevEval.bestMove) : undefined;

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
            highlight={shownCls ? CLASS_META[shownCls].color : undefined}
            badge={!retry && lastMove && shownCls ? { square: lastMove.to, cls: shownCls } : undefined}
            animKey={variation ? `v${vIdx}${variation.moves.length}` : pos}
            effect={retry ? undefined : effectFor(shownCls)}
            captured={captured}
            arrows={arrows}
            selected={activeSel}
            targets={targets}
            onSquareClick={onSquareClick}
            canDrag={canDrag}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
          />
        </div>
        <PlayerBar headers={a.headers} color={orientation} isYou={orientation === side} accuracy={a.accuracy[orientation]} />
        <div className="controls">
          <button onClick={() => (variation ? goto(variation.base) : goto(0))} aria-label="First">|&lt;</button>
          <button onClick={() => (variation ? stepBack() : goto(pos - 1))} aria-label="Previous">&lt;</button>
          <button onClick={() => (variation ? stepForward() : goto(pos + 1))} aria-label="Next">&gt;</button>
          <button onClick={() => goto(variation ? variation.base : last)} aria-label="Last">&gt;|</button>
          <button className={`play ${tour ? "on" : ""}`} onClick={() => (tour ? setTour(null) : startTour())} aria-label={t(tour ? "review.tourStop" : "review.tour")} title={t(tour ? "review.tourStop" : "review.tour")}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
              {tour ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13l11-6.5z" />}
            </svg>
          </button>
          <button onClick={() => setFlipped(!flipped)}>{t("review.flip")}</button>
        </div>
      </div>

      <div className="side-col">
        <div className="card coach">
          <Mascot mood={mood} size={80} />
          <div className="bubble" key={`${variation ? `v${vIdx}${vcls ?? ""}` : pos}-${retry ? "r" : ""}${retry?.result ?? ""}`}>
            {retry ? (
              <p>
                {retry.result === "right" && t("review.right")}
                {retry.result === "wrong" && t("review.wrong")}
                {!retry.result && t(practice?.kind === "punish" ? "review.askPunish" : practice?.kind === "learn" ? "review.askLearn" : "review.ask")}
              </p>
            ) : variation ? (
              <>
                <div className="bubble-title">
                  {vcls ? <><ClassBadge cls={vcls} size={22} /> {classLabel(vcls)}</> : t("explore.title")}
                </div>
                <p>{vcls && lastSan ? lineComment(vcls, lastSan, betterSan) : thinking ? t("explore.thinking") : t("explore.hint")}</p>
                {vdata && <p className="var-line" title={lineText(vdata.fens, vdata.sans, vdata.movers)}>{lineText(vdata.fens, vdata.sans, vdata.movers)}</p>}
              </>
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
                {tour && <p className="var-line">{t("review.tourStep", { i: tour.i + 1, n: tour.list.length })}</p>}
              </>
            )}
            {practice && !retry && (
              <div className="row">
                <button className="btn primary small" onClick={() => setRetry({})}>
                  {t(practice.kind === "punish" ? "review.punish" : practice.kind === "learn" ? "review.find" : "review.retry")}
                </button>
              </div>
            )}
            {variation && !retry && (
              <div className="row">
                <button className="btn ghost small" onClick={undo}>{t("explore.undo")}</button>
                <button className="btn ghost small" disabled={!engineMove} onClick={() => engineMove && commit(engineMove)}>{t("explore.engine")}</button>
                <button className="btn primary small" onClick={() => goto(variation.base)}>{t("explore.exit")}</button>
              </div>
            )}
            {retry && (
              <div className="row">
                {retry.result === "wrong" && <button className="btn ghost small" onClick={() => setRetry({})}>{t("review.again")}</button>}
                <button className="btn ghost small" onClick={() => setRetry(null)}>{t("review.stop")}</button>
              </div>
            )}
          </div>
        </div>

        <div className="card graph-card">
          <EvalGraph a={a} side={side} current={variation ? variation.base : pos} onSelect={goto} />
        </div>

        {!retry && lines.length > 0 && (
          <div className="card lines">
            <h3>{t("review.lines")}{thinking ? " ..." : ""}</h3>
            {lines.map((l) => (
              <div key={l.multiPv} className="line">
                <b>{getLineEvalLabel(l)}</b>
                <span>{lineToSan(linesFen, l.pv.slice(0, 5))}</span>
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
                  <button key={p} className={`move ${p === (variation ? variation.base : pos) ? "current" : ""}`} onClick={() => goto(p)}>
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
