import { ReactNode, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import Confetti from "@/ui/Confetti";
import PlayBoard from "@/ui/PlayBoard";
import TaskCard, { TaskStage } from "@/ui/TaskCard";
import { useMoveFeedback } from "@/lib/useMoveFeedback";
import { play } from "@/lib/sound";
import { EnginePool } from "@/engine/pool";
import { Mood } from "@/ui/classes";
import { Key, t } from "@/lib/i18n";
import { PUZZLE_THEMES, Puzzle, PuzzleTheme, fetchPuzzle } from "@/lib/puzzles";
import { lineText, stepsFrom } from "@/lib/followUp";
import { uciMoveParams, uciToSan } from "@/lib/chess";
import { Progress, addXp } from "@/lib/progress";
import { Side } from "@/lib/stats";

const XP_PER_PUZZLE = 10;
const REPLY_MS = 1200; // the opponent answers calmly, so you can follow what happens

// play: your turn. wait: your move was right, the reply is coming. wrong: your move stays on the board.
type Status = "loading" | "play" | "wait" | "wrong" | "solved" | "error";

export default function Puzzles({ pieceSet, onProgress, getPool }: { pieceSet: string; onProgress: (p: Progress) => void; getPool: () => Promise<EnginePool> }) {
  const fb = useMoveFeedback(getPool);
  const [theme, setTheme] = useState<PuzzleTheme>("daily");
  const [puzzle, setPuzzle] = useState<Puzzle>();
  const [fen, setFen] = useState("");
  const [ply, setPly] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [showAnswer, setShowAnswer] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string }>();
  const [wrongFen, setWrongFen] = useState<string>(); // the board after a wrong try
  const [replySan, setReplySan] = useState<string>();
  const timer = useRef<number>(undefined);
  // Session score: a puzzle counts for the streak only when solved without a wrong try or the answer shown.
  const [score, setScore] = useState({ solved: 0, streak: 0, best: 0 });
  const clean = useRef(true);

  const load = async (th: PuzzleTheme) => {
    window.clearTimeout(timer.current);
    fb.clear();
    setStatus("loading");
    setShowAnswer(false);
    setLastMove(undefined);
    setWrongFen(undefined);
    setReplySan(undefined);
    clean.current = true;
    try {
      const p = await fetchPuzzle(th);
      setPuzzle(p);
      setFen(p.fen);
      setPly(0);
      setStatus("play");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    load(theme);
    return () => window.clearTimeout(timer.current);
  }, [theme]);

  const solved = () => {
    setStatus("solved");
    play("success");
    setScore((s) => {
      const streak = clean.current ? s.streak + 1 : 0;
      return { solved: s.solved + 1, streak, best: Math.max(s.best, streak) };
    });
    onProgress(addXp(XP_PER_PUZZLE));
  };

  const onMove = (uci: string) => {
    if (!puzzle) return;
    const game = new Chess(fen);
    const m = game.move(uciMoveParams(uci));
    setLastMove({ from: m.from, to: m.to });
    setShowAnswer(false);
    setReplySan(undefined);
    // Any checkmate also counts, Lichess accepts alternative mates too.
    if (uci !== puzzle.solution[ply] && !game.isCheckmate()) {
      setStatus("wrong");
      setWrongFen(game.fen());
      clean.current = false;
      fb.check(fen, uci, false);
      return;
    }
    fb.check(fen, uci, true);
    setFen(game.fen());
    if (game.isCheckmate() || ply + 1 >= puzzle.solution.length) return solved();

    setStatus("wait");
    const reply = puzzle.solution[ply + 1];
    timer.current = window.setTimeout(() => {
      const r = game.move(uciMoveParams(reply));
      play(r.captured ? "capture" : "move");
      fb.clear();
      setLastMove({ from: r.from, to: r.to });
      setReplySan(r.san);
      setFen(game.fen());
      setPly(ply + 2);
      setStatus("play");
    }, REPLY_MS);
  };

  const tryAgain = () => {
    fb.clear();
    setWrongFen(undefined);
    setLastMove(undefined);
    setStatus("play");
  };

  const side: Side = puzzle?.fen.split(" ")[1] === "b" ? "black" : "white";
  const other = t(side === "white" ? "puzzle.black" : "puzzle.white");
  const expected = puzzle?.solution[ply];
  const arrows = [...(showAnswer && expected && status === "play" ? [{ from: expected.slice(0, 2), to: expected.slice(2, 4), color: "#22c58b" }] : []), ...(fb.fb?.arrows ?? [])];
  const mood: Mood = status === "solved" ? "cheer" : status === "wrong" ? "worried" : status === "loading" ? "thinking" : status === "wait" ? "happy" : "idle";
  const stage: TaskStage = status === "wrong" ? "wrong" : status === "solved" ? "right" : "task";
  const myMoves = puzzle ? Math.ceil(puzzle.solution.length / 2) : 1;
  const moveNo = Math.min(myMoves, ply / 2 + 1);

  let goal: ReactNode = t("puzzle.find");
  if (status === "loading") goal = t("puzzle.loading");
  if (status === "error") goal = t("puzzle.error");
  if (myMoves > 1 && status !== "solved" && status !== "loading" && status !== "error") goal = <>{t("puzzle.find")} <span className="task-count">{t("task.progress", { n: moveNo, total: myMoves })}</span></>;

  let message: ReactNode;
  if (status === "wrong") message = <><b>{t("task.notIt")}</b> {fb.fb?.text}</>;
  if (status === "wait") message = <><b>{t("task.good")}</b> {fb.fb?.text} {t("task.watch")}</>;
  if (status === "play" && replySan) message = t("task.replied", { side: other, san: replySan });
  if (status === "play" && showAnswer && expected) message = t("task.answer", { san: uciToSan(fen, expected) ?? expected });
  if (status === "solved" && puzzle) {
    const line = lineText(puzzle.fen, stepsFrom(puzzle.fen, puzzle.solution.slice(0, ply + 1)));
    message = <><b>{t("puzzle.solved")}</b> +{XP_PER_PUZZLE} XP<span className="task-line">{t("task.line", { line })}</span></>;
  }

  return (
    <div className="screen">
      <div className="player">
        {status === "solved" && <Confetti />}
        <div className="board-col">
          <div className="topbar">
            <span className="topbar-title">{t(`theme.${theme}` as Key)}</span>
            <span className="grow" />
            {puzzle && <span className="muted">{t("puzzle.rating", { n: puzzle.rating })}</span>}
          </div>
          {fen && (
            <PlayBoard
              fen={wrongFen ?? fen}
              orientation={side}
              pieceSet={pieceSet}
              onMove={onMove}
              disabled={status !== "play"}
              arrows={arrows}
              marks={fb.fb?.marks}
              lastMove={lastMove}
            />
          )}
        </div>
        <div className="side-col">
          <div className="chips">
            {PUZZLE_THEMES.map((th) => (
              <button key={th} className={`chip ${th === theme ? "on" : ""}`} onClick={() => setTheme(th)}>
                {t(`theme.${th}` as Key)}
              </button>
            ))}
          </div>
          <TaskCard stage={stage} mood={mood} title={t(`theme.${theme}` as Key)} side={puzzle ? side : undefined} goal={goal} message={message}>
            {status === "play" && (
              <>
                <button className="btn ghost small" onClick={() => { clean.current = false; setShowAnswer(true); }}>{t("puzzle.show")}</button>
                <button className="btn ghost small" onClick={() => load(theme)}>{t("puzzle.skip")}</button>
              </>
            )}
            {status === "wrong" && (
              <>
                <button className="btn primary small" onClick={tryAgain}>{t("task.tryAgain")}</button>
                <button className="btn ghost small" onClick={() => { tryAgain(); clean.current = false; setShowAnswer(true); }}>{t("puzzle.show")}</button>
              </>
            )}
            {(status === "solved" || status === "error") && <button className="btn primary small" onClick={() => load(theme)}>{t("puzzle.next")}</button>}
          </TaskCard>
          <div className="card score-card">
            <h3>{t("puzzle.session")}</h3>
            <div className="score-row">
              <div><b>{score.solved}</b><span>{t("puzzle.solvedCount")}</span></div>
              <div><b>{score.streak}</b><span>{t("puzzle.streak")}</span></div>
              <div><b>{score.best}</b><span>{t("puzzle.best")}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
