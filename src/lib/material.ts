import { Side } from "./stats";

const START: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ORDER = ["q", "r", "b", "n", "p"];

export interface Material {
  /** The opponent's pieces each side has taken, most valuable first (promotions can make this inexact). */
  taken: Record<Side, string[]>;
  /** Material lead in pawns, 0 for the side that is not ahead. */
  plus: Record<Side, number>;
}

/** Captured pieces and the material lead, read from a position. */
export function material(fen: string): Material {
  const count = { w: {} as Record<string, number>, b: {} as Record<string, number> };
  for (const ch of fen.split(" ")[0]) {
    if (!/[pnbrqPNBRQ]/.test(ch)) continue;
    const side = ch === ch.toUpperCase() ? "w" : "b";
    const type = ch.toLowerCase();
    count[side][type] = (count[side][type] ?? 0) + 1;
  }
  const missing = (side: "w" | "b") => ORDER.flatMap((t) => Array(Math.max(0, START[t] - (count[side][t] ?? 0))).fill(t) as string[]);
  const worth = (side: "w" | "b") => ORDER.reduce((sum, t) => sum + (count[side][t] ?? 0) * VALUE[t], 0);
  const lead = worth("w") - worth("b");
  return {
    taken: { white: missing("b"), black: missing("w") },
    plus: { white: Math.max(0, lead), black: Math.max(0, -lead) },
  };
}
