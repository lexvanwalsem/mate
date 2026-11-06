import { GameAnalysis } from "./analyze";
import { MoveClassification as MC } from "@/types/enums";
import { getPositionWinPercentage } from "@/engine/winPercentage";

export type Side = "white" | "black";

/** Display order of classes, best to worst. */
export const CLASS_ORDER: MC[] = [
  MC.Splendid, MC.Perfect, MC.Best, MC.Excellent, MC.Okay, MC.Opening, MC.Forced,
  MC.Inaccuracy, MC.Mistake, MC.Miss, MC.Blunder,
];

/** Position index p (1..n) is the result of move p-1, so odd positions are white's moves. */
export const sideOfPosition = (p: number): Side => ((p - 1) % 2 === 0 ? "white" : "black");

export function countClasses(a: GameAnalysis, side: Side): Record<MC, number> {
  const counts = Object.fromEntries(CLASS_ORDER.map((c) => [c, 0])) as Record<MC, number>;
  a.positions.forEach((p, i) => {
    if (i > 0 && p.moveClassification && sideOfPosition(i) === side) counts[p.moveClassification]++;
  });
  return counts;
}

/** Win chance (0-100) for the given side. */
export const winPctFor = (a: GameAnalysis, positionIdx: number, side: Side): number => {
  const w = getPositionWinPercentage(a.positions[positionIdx]);
  return side === "white" ? w : 100 - w;
};

export interface Moment { position: number; cls: MC; swing: number }

/** Biggest mistakes and best moves of the given side, in game order. */
export function keyMoments(a: GameAnalysis, side: Side, max = 6): Moment[] {
  const out: Moment[] = [];
  for (let p = 1; p < a.positions.length; p++) {
    if (sideOfPosition(p) !== side) continue;
    const cls = a.positions[p].moveClassification;
    if (cls !== MC.Blunder && cls !== MC.Mistake && cls !== MC.Miss && cls !== MC.Splendid && cls !== MC.Perfect) continue;
    out.push({ position: p, cls, swing: winPctFor(a, p, side) - winPctFor(a, p - 1, side) });
  }
  return out
    .sort((x, y) => Math.abs(y.swing) - Math.abs(x.swing))
    .slice(0, max)
    .sort((x, y) => x.position - y.position);
}

/** Which side is the user? 1) explicit hint, 2) username match, 3) white. */
export function pickSide(headers: Record<string, string>, hint: Side | undefined, usernames: string[]): { side: Side; known: boolean } {
  if (hint) return { side: hint, known: true };
  const names = usernames.map((u) => u.trim().toLowerCase()).filter(Boolean);
  if (names.includes((headers.White ?? "").toLowerCase())) return { side: "white", known: true };
  if (names.includes((headers.Black ?? "").toLowerCase())) return { side: "black", known: true };
  return { side: "white", known: false };
}

export const resultFor = (headers: Record<string, string>, side: Side): "win" | "loss" | "draw" | "unknown" => {
  const r = headers.Result;
  if (r === "1/2-1/2") return "draw";
  if (r === "1-0") return side === "white" ? "win" : "loss";
  if (r === "0-1") return side === "black" ? "win" : "loss";
  return "unknown";
};

export type Phase = "opening" | "middlegame" | "endgame";

import { getPieceMaterial } from "./chess";

const phaseOfMove = (a: GameAnalysis, moveIdx: number): Phase =>
  moveIdx < 20 ? "opening" : getPieceMaterial(a.fens[moveIdx]) <= 24 ? "endgame" : "middlegame";

/** Average move accuracy per game phase for one side (undefined when the phase never happened). */
export function phaseAccuracy(a: GameAnalysis, side: Side): Record<Phase, number | undefined> {
  const buckets: Record<Phase, number[]> = { opening: [], middlegame: [], endgame: [] };
  a.moveAccuracy.forEach((v, m) => {
    if (sideOfPosition(m + 1) === side) buckets[phaseOfMove(a, m)].push(v);
  });
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : undefined);
  return { opening: avg(buckets.opening), middlegame: avg(buckets.middlegame), endgame: avg(buckets.endgame) };
}

/** Last opening name seen in the game. */
export const openingName = (a: GameAnalysis): string | undefined =>
  [...a.positions].reverse().find((p) => p.opening)?.opening;

/** Seconds spent on each move (undefined when the clocks are missing). Adds the increment back. */
export function moveTimes(a: GameAnalysis): (number | undefined)[] {
  const inc = Number(a.headers.TimeControl?.match(/\+(\d+)/)?.[1] ?? 0);
  return a.clocks.map((now, i) => {
    const before = a.clocks[i - 2];
    return now === undefined || before === undefined ? undefined : Math.max(0, before - now + inc);
  });
}

export interface TimeSummary { avg: number; slowest: { position: number; seconds: number } }

export function timeSummary(a: GameAnalysis, side: Side): TimeSummary | undefined {
  const times = moveTimes(a)
    .map((seconds, i) => ({ position: i + 1, seconds }))
    .filter((m): m is { position: number; seconds: number } => m.seconds !== undefined && sideOfPosition(m.position) === side);
  if (!times.length) return undefined;
  return {
    avg: times.reduce((sum, m) => sum + m.seconds, 0) / times.length,
    slowest: times.reduce((best, m) => (m.seconds > best.seconds ? m : best)),
  };
}

/** Clock remaining for `color` once position `pos` is on the board. */
export function clockAt(a: GameAnalysis, pos: number, color: Side): number | undefined {
  for (let i = pos - 1; i >= 0; i--) {
    if ((i % 2 === 0 ? "white" : "black") === color && a.clocks[i] !== undefined) return a.clocks[i];
  }
  // before the player's first move the clock still shows the starting time
  const start = Number(a.headers.TimeControl?.match(/^(d+)/)?.[1]);
  return a.clocks.some((c) => c !== undefined) && start ? start : undefined;
}

export const formatSeconds = (s: number): string => {
  if (s >= 3600) return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  if (s >= 60) return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
};
