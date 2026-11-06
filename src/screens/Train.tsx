import { ReactNode, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import Mascot from "@/ui/Mascot";
import Confetti from "@/ui/Confetti";
import PlayBoard from "@/ui/PlayBoard";
import TaskCard, { TaskStage } from "@/ui/TaskCard";
import { useMoveFeedback } from "@/lib/useMoveFeedback";
import { play } from "@/lib/sound";
import { EnginePool } from "@/engine/pool";
import { Mood, classLabel } from "@/ui/classes";
import { Key, t } from "@/lib/i18n";
import { MistakeItem, bestSan, loadMistakes, moveSquares, removeMistake } from "@/lib/mistakes";
import { PlayedStep, engineLine, lineText, stepsFrom } from "@/lib/followUp";
import { uciMoveParams } from "@/lib/chess";
import { Progress, addXp } from "@/lib/progress";
import { Side } from "@/lib/stats";

const XP_PER_FIX = 10;
const STEP_MS = 1000; // pause between moves of the follow-up line
const GREEN = "#22c58b";
const GREY = "#8f93a8";

export default function Train({ pieceSet, onProgress, getPool }: { pieceSet: string; onProgress: (p: Progress) => void; getPool: () => Promise<EnginePool> }) {
  const fb = useMoveFeedback(getPool);
  const [items, setItems] = useState<MistakeItem[]>(loadMistakes);
  const [stage, setStage] = useState<TaskStage>("task");
  const [showAnswer, setShowAnswer] = useState(false);
  // Your move stays on the board until you choose what to do next.
  const [shown, setShown] = useState<{ fen: string; last: { from: string; to: string } }>();
  const [follow, setFollow] = useState<{ steps: PlayedStep[]; at: number; loading: boolean }>();
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!items.length) {
    return (
      <div className="screen home">
        <Mascot mood="sleepy" size={150} />
        <p className="tagline">{t("train.empty")}</p>
      </div>
    );
  }

  const item = items[0];
  const kind = item.kind ?? "mine";
  const side: Side = item.fen.split(" ")[1] === "b" ? "black" : "white";
  const mood: Mood = stage === "right" ? "cheer" : stage === "wrong" ? "worried" : "thinking";
  const best = bestSan(item);

  // Before you move, a grey arrow shows the move you played in the game.
  const played = kind === "mine" ? moveSquares(item.fen, item.playedSan) : undefined;
  const taskArrows = stage === "task" && played ? [{ from: played.from, to: played.to, color: GREY }] : [];
  const answerArrows = showAnswer && stage === "task" ? [{ from: item.bestUci.slice(0, 2), to: item.bestUci.slice(2, 4), color: GREEN }] : [];
  const playing = !!follow && follow.at > 0; // while the follow-up plays, the arrows of your move would point at the wrong squares
  const arrows = [...taskArrows, ...answerArrows, ...(playing ? [] : (fb.fb?.arrows ?? []))];

  const reset = () => {
    window.clearTimeout(timer.current);
    fb.clear();
    setShown(undefined);
    setFollow(undefined);
    setStage("task");
  };

  const onMove = (uci: string) => {
    const game = new Chess(item.fen);
    const m = game.move(uciMoveParams(uci));
    setShown({ fen: game.fen(), last: { from: m.from, to: m.to } });
    if (item.accepted.includes(uci)) {
      setStage("right");
      window.setTimeout(() => play("success"), 250);
      fb.check(item.fen, uci, true);
      onProgress(addXp(XP_PER_FIX));
      removeMistake(item.id);
    } else {
      setStage("wrong");
      fb.check(item.fen, uci, false);
    }
  };

  // Plays the engine's continuation one move per second, so you see why the move works.
  const showFollowUp = async () => {
    if (!shown) return;
    setFollow({ steps: [], at: 0, loading: true });
    const steps = stepsFrom(shown.fen, await engineLine(await getPool(), shown.fen, 4));
    const tick = (i: number) => {
      setFollow({ steps, at: i, loading: false });
      if (i > 0) play("move");
      if (i < steps.length) timer.current = window.setTimeout(() => tick(i + 1), STEP_MS);
    };
    tick(0);
  };

  const next = () => {
    reset();
    setShowAnswer(false);
    setItems(loadMistakes());
  };

  const skip = () => {
    reset();
    setShowAnswer(false);
    setItems([...items.slice(1), item]);
  };

  const followStep = follow && follow.at > 0 ? follow.steps[follow.at - 1] : undefined;
  const boardFen = followStep?.fen ?? shown?.fen ?? item.fen;
  const boardLast = followStep ? { from: followStep.from, to: followStep.to } : (shown?.last ?? item.lastMove);

  const contextKey = kind === "punish" ? "train.punish" : kind === "learn" ? "train.learn" : "train.played";
  const contextText = t(contextKey, { san: item.playedSan, cls: classLabel(item.cls).toLowerCase() });

  let message: ReactNode;
  if (stage === "wrong") message = <><b>{t("task.notIt")}</b> {fb.fb?.text}</>;
  if (stage === "right") {
    message = (
      <>
        <b>{t("train.right")}</b> {fb.fb?.text}
        {follow && <span className="task-line">{follow.loading ? t("task.thinking") : t("task.following", { line: lineText(shown!.fen, follow.steps.slice(0, follow.at)) })}</span>}
      </>
    );
  }
  if (stage === "task" && showAnswer) message = t("task.answer", { san: best });

  return (
    <div className="screen">
      <div className="player">
        {stage === "right" && <Confetti />}
        <div className="board-col">
          <div className="topbar">
            <span className="topbar-title">{t("nav.train")}</span>
            <span className="grow" />
            <span className="muted">{t("train.count", { n: items.length })}</span>
          </div>
          <PlayBoard
            key={item.id}
            fen={boardFen}
            orientation={side}
            pieceSet={pieceSet}
            onMove={onMove}
            disabled={stage !== "task"}
            arrows={arrows}
            marks={playing ? undefined : fb.fb?.marks}
            lastMove={boardLast}
          />
        </div>
        <div className="side-col">
          <TaskCard stage={stage} mood={mood} title={t(`train.title.${kind}` as Key)} side={side} context={contextText} goal={t(`train.goal.${kind}` as Key, { san: item.playedSan })} message={message}>
            {stage === "task" && (
              <>
                <button className="btn ghost small" onClick={() => setShowAnswer(true)}>{t("train.show")}</button>
                {items.length > 1 && <button className="btn ghost small" onClick={skip}>{t("puzzle.skip")}</button>}
              </>
            )}
            {stage === "wrong" && (
              <>
                <button className="btn primary small" onClick={reset}>{t("task.tryAgain")}</button>
                <button className="btn ghost small" onClick={() => { reset(); setShowAnswer(true); }}>{t("train.show")}</button>
              </>
            )}
            {stage === "right" && (
              <>
                {!follow && <button className="btn ghost small" onClick={showFollowUp}>{t("task.follow")}</button>}
                <button className="btn primary small" onClick={next}>{t("train.next")}</button>
              </>
            )}
          </TaskCard>
          <p className="muted side-note">{t("train.intro")}</p>
        </div>
      </div>
    </div>
  );
}
