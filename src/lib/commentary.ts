import { GameAnalysis } from "./analyze";
import { MoveClassification as MC } from "@/types/enums";
import { Side, sideOfPosition } from "./stats";
import { uciToSan } from "./chess";
import { t } from "./i18n";

/** What the mascot says about move number `p` (position index 1..n), from `side`'s point of view. */
export function commentFor(a: GameAnalysis, p: number, side: Side): string {
  const cls = a.positions[p]?.moveClassification;
  if (!cls) return "";

  const mine = sideOfPosition(p) === side;
  const san = a.sans[p - 1];
  const bestUci = a.positions[p - 1].bestMove;
  const best = uciToSan(a.fens[p - 1], bestUci);
  const better = best && bestUci !== a.uciMoves[p - 1] ? t("better", { best }) : "";
  const who = t(mine ? "who.you" : "who.opp");
  const opening = a.positions[p].opening;
  const vars = { san, better, who, opening: opening ?? "" };
  const me = mine ? "me" : "opp";

  switch (cls) {
    case MC.Splendid: return t(`c.splendid.${me}`, vars);
    case MC.Perfect: return t(`c.perfect.${me}`, vars);
    case MC.Best: return t(`c.best.${me}`, vars);
    case MC.Excellent: return t("c.excellent", vars);
    case MC.Okay: return t("c.okay", vars);
    case MC.Opening: return t(opening ? "c.openingNamed" : "c.opening", vars);
    case MC.Forced: return t("c.forced", vars);
    case MC.Inaccuracy: return t("c.inaccuracy", vars);
    case MC.Mistake: return t("c.mistake", vars);
    case MC.Miss: return t(`c.miss.${me}`, vars);
    case MC.Blunder: return t("c.blunder", vars);
  }
}

export function verdictFor(accuracy: number): string {
  if (accuracy >= 95) return t("verdict.95");
  if (accuracy >= 85) return t("verdict.85");
  if (accuracy >= 70) return t("verdict.70");
  if (accuracy >= 50) return t("verdict.50");
  return t("verdict.0");
}

/** Short verdict on a move you tried on the board. `betterSan` is the engine's preference when yours was not the best. */
export function lineComment(cls: MC, san: string, betterSan?: string): string {
  const better = betterSan ? t("better", { best: betterSan }) : "";
  const vars = { san, better, who: t("who.you") };
  switch (cls) {
    case MC.Best: return t("c.best.me", vars);
    case MC.Excellent: return t("c.excellent", vars);
    case MC.Okay: return t("c.okay", vars);
    case MC.Inaccuracy: return t("c.inaccuracy", vars);
    case MC.Mistake: return t("c.mistake", vars);
    case MC.Miss: return t("c.mistake", vars);
    case MC.Blunder: return t("c.blunder", vars);
    default: return t("c.okay", vars);
  }
}
