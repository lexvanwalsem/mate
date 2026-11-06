import { useState } from "react";
import Mascot from "@/ui/Mascot";
import Confetti from "@/ui/Confetti";
import PlayBoard from "@/ui/PlayBoard";
import { useMoveFeedback } from "@/lib/useMoveFeedback";
import { play } from "@/lib/sound";
import { EnginePool } from "@/engine/pool";
import { Mood, classLabel } from "@/ui/classes";
import { t } from "@/lib/i18n";
import { MistakeItem, bestSan, loadMistakes, removeMistake } from "@/lib/mistakes";
import { Progress, addXp } from "@/lib/progress";
import { Side } from "@/lib/stats";

const XP_PER_FIX = 10;

export default function Train({ pieceSet, onProgress, getPool }: { pieceSet: string; onProgress: (p: Progress) => void; getPool: () => Promise<EnginePool> }) {
  const fb = useMoveFeedback(getPool);
  const [items, setItems] = useState<MistakeItem[]>(loadMistakes);
  const [status, setStatus] = useState<"play" | "wrong" | "right">("play");
  const [showAnswer, setShowAnswer] = useState(false);

  if (!items.length) {
    return (
      <div className="screen home">
        <Mascot mood="sleepy" size={150} />
        <p className="tagline">{t("train.empty")}</p>
      </div>
    );
  }

  const item = items[0];
  const orientation: Side = item.fen.split(" ")[1] === "b" ? "black" : "white";
  const mood: Mood = status === "right" ? "cheer" : status === "wrong" ? "worried" : "thinking";
  const arrows = [...(showAnswer || status === "right" ? [{ from: item.bestUci.slice(0, 2), to: item.bestUci.slice(2, 4), color: "#22c58b" }] : []), ...(fb.fb?.arrows ?? [])];

  const onMove = (uci: string) => {
    if (item.accepted.includes(uci)) {
      setStatus("right");
      window.setTimeout(() => play("success"), 250);
      fb.check(item.fen, uci, true);
      onProgress(addXp(XP_PER_FIX));
      removeMistake(item.id);
    } else {
      setStatus("wrong");
      fb.check(item.fen, uci, false);
    }
  };

  const next = () => {
    fb.clear();
    setItems(loadMistakes());
    setStatus("play");
    setShowAnswer(false);
  };

  return (
    <div className="screen">
      <div className="player">
        {status === "right" && <Confetti />}
        <div className="board-col">
          <div className="topbar">
            <span className="topbar-title">{t("nav.train")}</span>
            <span className="grow" />
            <span className="muted">{t("train.count", { n: items.length })}</span>
          </div>
          <PlayBoard
            key={`${item.id}-${status}`}
            fen={item.fen}
            orientation={orientation}
            pieceSet={pieceSet}
            onMove={onMove}
            disabled={status === "right"}
            arrows={arrows}
            marks={fb.fb?.marks}
          />
        </div>
        <div className="side-col">
          <p className="muted side-note">{t("train.intro")}</p>
          <div className="card coach">
            <Mascot mood={mood} size={96} />
            <div className="bubble">
              <p>{t(item.kind === "punish" ? "train.punish" : item.kind === "learn" ? "train.learn" : "train.played", { san: item.playedSan, cls: classLabel(item.cls) })}</p>
              {status === "wrong" && <p><b>{fb.fb?.text ?? t("train.wrong")}</b></p>}
              {status === "right" && <p><b>{t("train.right")}</b> {bestSan(item)} +{XP_PER_FIX} XP</p>}
              {status === "right" && fb.fb?.correct && <p>{fb.fb.text}</p>}
              <div className="row">
                {status === "right" ? (
                  <button className="btn primary small" onClick={next}>{t("train.next")}</button>
                ) : (
                  <button className="btn ghost small" onClick={() => setShowAnswer(true)}>{t("train.show")}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
