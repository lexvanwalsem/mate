import { useState } from "react";
import Mascot from "@/ui/Mascot";
import Confetti from "@/ui/Confetti";
import PlayBoard from "@/ui/PlayBoard";
import { Mood, classLabel } from "@/ui/classes";
import { t } from "@/lib/i18n";
import { MistakeItem, bestSan, loadMistakes, removeMistake } from "@/lib/mistakes";
import { Progress, addXp } from "@/lib/progress";
import { Side } from "@/lib/stats";

const XP_PER_FIX = 10;

export default function Train({ pieceSet, onProgress }: { pieceSet: string; onProgress: (p: Progress) => void }) {
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
  const arrows = showAnswer || status === "right" ? [{ from: item.bestUci.slice(0, 2), to: item.bestUci.slice(2, 4), color: "#22c58b" }] : [];

  const onMove = (uci: string) => {
    if (item.accepted.includes(uci)) {
      setStatus("right");
      onProgress(addXp(XP_PER_FIX));
      removeMistake(item.id);
    } else {
      setStatus("wrong");
    }
  };

  const next = () => {
    setItems(loadMistakes());
    setStatus("play");
    setShowAnswer(false);
  };

  return (
    <div className="screen with-intro">
      <p className="muted">{t("train.intro")} {t("train.count", { n: items.length })}</p>
      <div className="player">
        {status === "right" && <Confetti />}
        <div className="board-col">
          <PlayBoard
            key={`${item.id}-${status}`}
            fen={item.fen}
            orientation={orientation}
            pieceSet={pieceSet}
            onMove={onMove}
            disabled={status === "right"}
            arrows={arrows}
          />
        </div>
        <div className="side-col">
          <div className="card coach">
            <Mascot mood={mood} size={96} />
            <div className="bubble">
              <p>{t("train.played", { san: item.playedSan, cls: classLabel(item.cls) })}</p>
              {status === "wrong" && <p><b>{t("train.wrong")}</b></p>}
              {status === "right" && <p><b>{t("train.right")}</b> {bestSan(item)} +{XP_PER_FIX} XP</p>}
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
