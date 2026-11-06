import { useRef, useState } from "react";
import { EnginePool } from "@/engine/pool";
import { Chess } from "chess.js";
import { MoveFeedback, explainWrong, firstGlance } from "./feedback";
import { uciMoveParams } from "./chess";
import { play } from "./sound";

/** State for the feedback on the last move you tried. A wrong move shows its arrow at once, the explanation follows. */
export function useMoveFeedback(getPool: () => Promise<EnginePool>) {
  const [fb, setFb] = useState<MoveFeedback | null>(null);
  const token = useRef(0);

  const check = async (fenBefore: string, uci: string, correct: boolean) => {
    const mine = ++token.current;
    try {
      setFb(firstGlance(fenBefore, uci, correct));
      if (!correct) play("error");
      else play(new Chess(fenBefore).move(uciMoveParams(uci)).captured ? "capture" : "move");
      if (correct) return;
      const pool = await getPool();
      const full = await explainWrong(pool, fenBefore, uci);
      if (mine === token.current) setFb(full);
    } catch {
      // no engine answer: the first glance stays on screen
    }
  };

  const clear = () => {
    token.current++;
    setFb(null);
  };

  return { fb, check, clear };
}
