import { ReactNode } from "react";
import Mascot from "./Mascot";
import { Mood } from "./classes";
import { t } from "@/lib/i18n";
import { Side } from "@/lib/stats";

/** Where you are in an exercise: reading the task, just tried a wrong move, or found it. */
export type TaskStage = "task" | "wrong" | "right";

interface Props {
  stage: TaskStage;
  mood: Mood;
  title: string;
  /** Who moves; shown as a small colored tag. */
  side?: Side;
  /** What happened before, in one sentence. */
  context?: ReactNode;
  /** What you have to do, always visible. */
  goal: ReactNode;
  /** The answer to your move: why it is wrong or why it works. */
  message?: ReactNode;
  children?: ReactNode; // buttons
}

const STEPS = ["task.step1", "task.step2", "task.step3"] as const;

/** The same card for lessons, puzzles and training: three numbered steps, the task, the feedback, the buttons. */
export default function TaskCard({ stage, mood, title, side, context, goal, message, children }: Props) {
  const at = stage === "task" ? 0 : stage === "wrong" ? 1 : 2;
  return (
    <div className="card task">
      <ol className="task-steps">
        {STEPS.map((key, i) => (
          <li key={key} className={i < at ? "done" : i === at ? `on ${stage}` : ""}>
            <span className="task-num">{i + 1}</span>
            {t(key)}
          </li>
        ))}
      </ol>
      <div className="task-body">
        <Mascot mood={mood} size={84} />
        <div className="task-text">
          <div className="task-head">
            <span className="bubble-title">{title}</span>
            {side && (
              <span className="task-side">
                <span className={`chip-color ${side}`} />
                {t("puzzle.toMove", { side: t(side === "white" ? "puzzle.white" : "puzzle.black") })}
              </span>
            )}
          </div>
          {context && <p className="task-context">{context}</p>}
          <p className="task-goal">{goal}</p>
        </div>
      </div>
      {/* the message area keeps its place, so the card does not jump when feedback arrives */}
      <div className={`task-msg ${stage} ${message ? "" : "empty"}`} key={stage}>{message}</div>
      {children && <div className="task-actions">{children}</div>}
    </div>
  );
}
