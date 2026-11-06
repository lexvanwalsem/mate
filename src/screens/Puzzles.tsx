import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import Mascot from "@/ui/Mascot";
import Confetti from "@/ui/Confetti";
import PlayBoard from "@/ui/PlayBoard";
import { Mood } from "@/ui/classes";
import { Key, t } from "@/lib/i18n";
import { PUZZLE_THEMES, Puzzle, PuzzleTheme, fetchPuzzle } from "@/lib/puzzles";
import { Progress, addXp } from "@/lib/progress";
import { Side } from "@/lib/stats";

const XP_PER_PUZZLE = 10;
const uciParts = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

type Status = "loading" | "play" | "wrong" | "solved" | "error";

export default function Puzzles({ pieceSet, onProgress }: { pieceSet: string; onProgress: (p: Progress) => void }) {
  const [theme, setTheme] = useState<PuzzleTheme>("mateIn1");
  const [puzzle, setPuzzle] = useState<Puzzle>();
  const [fen, setFen] = useState("");
  const [ply, setPly] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [showAnswer, setShowAnswer] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string }>();
  const timer = useRef<number>(undefined);

  const load = async (th: PuzzleTheme) => {
    setStatus("loading");
    setShowAnswer(false);
    setLastMove(undefined);
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
    onProgress(addXp(XP_PER_PUZZLE));
  };

  const onMove = (uci: string) => {
    if (!puzzle) return;
    const chess = new Chess(fen);
    const trial = new Chess(fen);
    trial.move(uciParts(uci));
    // Any checkmate also counts, Lichess accepts alternative mates too.
    if (uci !== puzzle.solution[ply] && !trial.isCheckmate()) {
      setStatus("wrong");
      return;
    }
    chess.move(uciParts(uci));
    setLastMove({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
    setFen(chess.fen());
    setStatus("play");
    setShowAnswer(false);
    if (chess.isCheckmate() || ply + 1 >= puzzle.solution.length) return solved();

    const reply = puzzle.solution[ply + 1];
    timer.current = window.setTimeout(() => {
      chess.move(uciParts(reply));
      setLastMove({ from: reply.slice(0, 2), to: reply.slice(2, 4) });
      setFen(chess.fen());
      setPly(ply + 2);
    }, 450);
  };

  const orientation: Side = puzzle?.fen.split(" ")[1] === "b" ? "black" : "white";
  const expected = puzzle?.solution[ply];
  const arrows = showAnswer && expected ? [{ from: expected.slice(0, 2), to: expected.slice(2, 4), color: "#22c58b" }] : [];
  const mood: Mood = status === "solved" ? "cheer" : status === "wrong" ? "worried" : status === "loading" ? "thinking" : "happy";

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
              fen={fen}
              orientation={orientation}
              pieceSet={pieceSet}
              onMove={onMove}
              disabled={status !== "play" && status !== "wrong"}
              arrows={arrows}
              lastMove={lastMove}
            />
          )}
        </div>
        <div className="side-col">
          <p className="muted side-note">{t("puzzle.intro")}</p>
          <div className="chips">
      {PUZZLE_THEMES.map((th) => (
        <button key={th} className={`chip ${th === theme ? "on" : ""}`} onClick={() => setTheme(th)}>
          {t(`theme.${th}` as Key)}
        </button>
      ))}
          </div>
          <div className="card coach">
            <Mascot mood={mood} size={96} />
            <div className="bubble">
              {status === "loading" && <p>{t("puzzle.loading")}</p>}
              {status === "error" && <p>{t("puzzle.error")}</p>}
              {puzzle && status !== "loading" && status !== "error" && (
                <>
                  <div className="bubble-title">{t("puzzle.toMove", { side: t(orientation === "white" ? "puzzle.white" : "puzzle.black") })}</div>
                  <p className="muted">{t("puzzle.rating", { n: puzzle.rating })}</p>
                </>
              )}
              {status === "wrong" && <p><b>{t("puzzle.wrong")}</b></p>}
              {status === "solved" && <p><b>{t("puzzle.solved")}</b> +{XP_PER_PUZZLE} XP</p>}
              <div className="row">
                {status === "solved" || status === "error" ? (
                  <button className="btn primary small" onClick={() => load(theme)}>{t("puzzle.next")}</button>
                ) : (
                  status !== "loading" && <button className="btn ghost small" onClick={() => setShowAnswer(true)}>{t("puzzle.show")}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
