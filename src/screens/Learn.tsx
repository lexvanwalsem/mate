import { useState } from "react";
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

export default function Learn({ pieceSet, progress, onProgress, getPool }: Props) {
  const [lessonId, setLessonId] = useState<string>();
  const lesson = ALL_LESSONS.find((l) => l.id === lessonId);

  if (!lesson) {
    return (
      <div className="screen path">
        <p className="muted">{t("learn.intro")}</p>
        {UNITS.map((u) => (
          <div key={u.id} className="unit card">
            <h3>{t(`unit.${u.id}` as Key)}</h3>
            <div className="lessons">
              {u.lessons.map((l) => (
                <button key={l.id} className={`lesson-btn ${progress.done.includes(l.id) ? "done" : ""}`} onClick={() => setLessonId(l.id)}>
                  {lt(l.title)}
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

  const step = lesson.steps[idx];
  const orientation: Side = step?.fen.split(" ")[1] === "b" ? "black" : "white";

  const next = () => {
    setFeedback("none");
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
      : answer && (showHint || wrongs >= 2) && feedback !== "right"
        ? [{ from: answer.slice(0, 2), to: answer.slice(2, 4), color: "#22c58b" }]
        : [];

  const arrows = [...baseArrows, ...(fb.fb?.arrows ?? [])];

  const onMove = (uci: string) => {
    if (step.kind !== "move") return;
    if (step.accept.includes(uci)) {
      setFeedback("right");
      fb.check(step.fen, uci, true);
    }
    else {
      setFeedback("wrong");
      fb.check(step.fen, uci, false);
      setWrongs(wrongs + 1);
    }
  };

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
          <PlayBoard key={`${idx}-${wrongs}-${feedback}`} fen={step.fen} orientation={orientation} pieceSet={pieceSet} onMove={onMove} disabled={feedback === "right"} arrows={arrows} marks={fb.fb?.marks} />
        )}
      </div>

      <div className="side-col">
        <div className="card coach">
          <Mascot mood={mood} size={96} />
          <div className="bubble">
            <div className="bubble-title">{lt(lesson.title)}</div>
            <p>{lt(step.text)}</p>
            {feedback === "right" && <p><b>{t("learn.correct")}</b></p>}
            {feedback === "wrong" && <p><b>{fb.fb?.text ?? t("learn.wrong")}</b></p>}
            {feedback === "right" && fb.fb?.correct && <p>{fb.fb.text}</p>}
            {showHint && step.kind === "move" && <p className="muted">{lt(step.hint)}</p>}
            <div className="row">
              {(step.kind === "info" || feedback === "right") && <button className="btn primary small" onClick={next}>{t("learn.next")}</button>}
              {step.kind === "move" && feedback !== "right" && (
                <>
                  <button className="btn ghost small" onClick={() => setShowHint(true)}>{t("learn.hint")}</button>
                  {wrongs >= 1 && <button className="btn ghost small" onClick={() => setWrongs(2)}>{t("learn.show")}</button>}
                </>
              )}
            </div>
          </div>
        </div>
        <button className="btn ghost" onClick={onExit}>{t("learn.back")}</button>
      </div>
    </div>
  );
}
