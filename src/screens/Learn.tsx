import { ReactNode, useState } from "react";
import { Chess } from "chess.js";
import TaskCard, { TaskStage } from "@/ui/TaskCard";
import { uciMoveParams } from "@/lib/chess";
import Mascot from "@/ui/Mascot";
import Confetti from "@/ui/Confetti";
import PlayBoard from "@/ui/PlayBoard";
import { useMoveFeedback } from "@/lib/useMoveFeedback";
import { play } from "@/lib/sound";
import { EnginePool } from "@/engine/pool";
import Board, { piecesFromFen } from "@/ui/Board";
import { Mood } from "@/ui/classes";
import { Key, t } from "@/lib/i18n";
import { ALL_LESSONS, Lesson, UNITS, XP_PER_LESSON, XP_PER_STEP, lt } from "@/lib/lessons";
import { Progress, addXp } from "@/lib/progress";
import { Side } from "@/lib/stats";

interface Props {
  pieceSet: string;
  progress: Progress;
  onProgress: (p: Progress) => void;
  getPool: () => Promise<EnginePool>;
}

// The piece that stands for each lesson on its button.
const LESSON_PIECE: Record<string, string> = {
  rook: "R", bishop: "B", queen: "Q", knight: "N", pawn: "P", king: "K",
  "back-rank": "R", "queen-mate": "Q", "two-rooks": "R", scholars: "Q",
  fork: "N", pin: "B", skewer: "R", "pawn-fork": "P", "free-piece": "N",
  opening: "P", promotion: "Q",
};

export default function Learn({ pieceSet, progress, onProgress, getPool }: Props) {
  const [lessonId, setLessonId] = useState<string>();
  const lesson = ALL_LESSONS.find((l) => l.id === lessonId);

  if (!lesson) {
    return (
      <div className="screen path">
        <p className="muted">{t("learn.intro")}</p>
        {UNITS.map((u) => (
          <div key={u.id} className="unit card">
            <h3>
              {t(`unit.${u.id}` as Key)}
              <span className="unit-count">{u.lessons.filter((l) => progress.done.includes(l.id)).length}/{u.lessons.length}</span>
            </h3>
            <div className="lessons">
              {u.lessons.map((l) => (
                <button key={l.id} className={`lesson-btn ${progress.done.includes(l.id) ? "done" : ""}`} onClick={() => setLessonId(l.id)}>
                  <img alt="" src={`pieces/${pieceSet}/w${LESSON_PIECE[l.id] ?? "P"}.svg`} />
                  <span>{lt(l.title)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <LessonPlayer key={lesson.id} lesson={lesson} pieceSet={pieceSet} alreadyDone={progress.done.includes(lesson.id)} onProgress={onProgress} getPool={getPool} onExit={() => setLessonId(undefined)} />;
}

type Feedback = "none" | "right" | "wrong";

function LessonPlayer({ lesson, pieceSet, alreadyDone, onProgress, getPool, onExit }: { lesson: Lesson; pieceSet: string; alreadyDone: boolean; onProgress: (p: Progress) => void; getPool: () => Promise<EnginePool>; onExit: () => void }) {
  const fb = useMoveFeedback(getPool);
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [wrongs, setWrongs] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [earned, setEarned] = useState<number>();
  // Your move stays on the board until you go on.
  const [shown, setShown] = useState<{ fen: string; last: { from: string; to: string } }>();

  const step = lesson.steps[idx];
  const orientation: Side = step?.fen.split(" ")[1] === "b" ? "black" : "white";

  const next = () => {
    setFeedback("none");
    setShown(undefined);
    fb.clear();
    setWrongs(0);
    setShowHint(false);
    if (idx + 1 < lesson.steps.length) {
      setIdx(idx + 1);
      return;
    }
    const gain = alreadyDone ? 0 : XP_PER_LESSON + lesson.steps.length * XP_PER_STEP;
    onProgress(addXp(gain, lesson.id));
    setEarned(gain);
    play("success");
  };

  if (earned !== undefined) {
    return (
      <div className="screen player">
        <Confetti />
        <div className="card done-card" style={{ gridColumn: "1 / -1" }}>
          <Mascot mood="cheer" size={170} />
          <h2>{t("learn.done")}</h2>
          {earned > 0 && <div className="pill-xp">{t("learn.xp", { n: earned })}</div>}
          <button className="btn primary" onClick={onExit}>{t("learn.back")}</button>
        </div>
      </div>
    );
  }

  const mood: Mood = feedback === "right" ? "cheer" : feedback === "wrong" ? "worried" : "happy";
  const answer = step.kind === "move" ? step.accept[0] : undefined;
  const baseArrows =
    step.kind === "info"
      ? (step.arrows ?? []).map(([from, to]) => ({ from, to, color: "#6c4cf5" }))
      : answer && (showHint || wrongs >= 2) && feedback === "none"
        ? [{ from: answer.slice(0, 2), to: answer.slice(2, 4), color: "#22c58b" }]
        : [];

  const arrows = [...baseArrows, ...(fb.fb?.arrows ?? [])];

  const onMove = (uci: string) => {
    if (step.kind !== "move") return;
    const game = new Chess(step.fen);
    const m = game.move(uciMoveParams(uci));
    setShown({ fen: game.fen(), last: { from: m.from, to: m.to } });
    if (step.accept.includes(uci)) {
      setFeedback("right");
      fb.check(step.fen, uci, true);
    } else {
      setFeedback("wrong");
      fb.check(step.fen, uci, false);
      setWrongs(wrongs + 1);
    }
  };

  const tryAgain = () => {
    fb.clear();
    setShown(undefined);
    setFeedback("none");
  };

  const stage: TaskStage = feedback === "right" ? "right" : feedback === "wrong" ? "wrong" : "task";
  let message: ReactNode;
  if (feedback === "wrong") message = <><b>{t("task.notIt")}</b> {fb.fb?.text}</>;
  if (feedback === "right") message = <><b>{t("learn.correct")}</b> {fb.fb?.correct && fb.fb.text}</>;
  if (feedback === "none" && showHint && step.kind === "move") message = lt(step.hint);

  return (
    <div className="screen player">
      <div className="board-col">
        <div className="topbar">
          <span className="topbar-title">{lt(lesson.title)}</span>
          <div className="progress grow"><div className="progress-fill" style={{ width: `${(idx / lesson.steps.length) * 100}%` }} /></div>
          <span className="muted">{idx + 1}/{lesson.steps.length}</span>
        </div>
        {step.kind === "info" ? (
          <Board pieces={piecesFromFen(step.fen)} orientation={orientation} pieceSet={pieceSet} arrows={arrows} />
        ) : (
          <PlayBoard key={idx} fen={shown?.fen ?? step.fen} orientation={orientation} pieceSet={pieceSet} onMove={onMove} disabled={feedback !== "none"} arrows={arrows} marks={fb.fb?.marks} lastMove={shown?.last} />
        )}
      </div>

      <div className="side-col">
        <TaskCard stage={stage} mood={mood} title={lt(lesson.title)} side={step.kind === "move" ? orientation : undefined} context={step.kind === "move" ? t("learn.goal") : lt(step.text)} goal={step.kind === "move" ? lt(step.text) : t("learn.read")} message={message}>
          {(step.kind === "info" || feedback === "right") && <button className="btn primary small" onClick={next}>{t("learn.next")}</button>}
          {step.kind === "move" && feedback === "wrong" && <button className="btn primary small" onClick={tryAgain}>{t("task.tryAgain")}</button>}
          {step.kind === "move" && feedback !== "right" && (
            <>
              {!showHint && <button className="btn ghost small" onClick={() => { tryAgain(); setShowHint(true); }}>{t("learn.hint")}</button>}
              {wrongs >= 1 && <button className="btn ghost small" onClick={() => { tryAgain(); setWrongs(2); }}>{t("learn.show")}</button>}
            </>
          )}
        </TaskCard>
        <button className="btn ghost" onClick={onExit}>{t("learn.back")}</button>
      </div>
    </div>
  );
}
