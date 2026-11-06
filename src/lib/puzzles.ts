// Puzzles come live from the free Lichess puzzle API (puzzle data is CC0).
import { Chess } from "chess.js";

export interface Puzzle {
  id: string;
  rating: number;
  fen: string; // position with the player to move
  solution: string[]; // uci, player move first, then opponent, and so on
  themes: string[];
  /** The position one move earlier and the opponent's move that led to the puzzle, so it can be played in. */
  before?: { fen: string; from: string; to: string };
}

export const PUZZLE_THEMES = ["daily", "mateIn1", "mateIn2", "fork", "pin", "skewer", "hangingPiece", "endgame", "opening"] as const;
export type PuzzleTheme = (typeof PUZZLE_THEMES)[number];

/** Replays the game moves to get the real position (with move numbers) and the move just before the puzzle. */
function lead(pgn: string): { fen: string; before?: Puzzle["before"] } | undefined {
  try {
    const game = new Chess();
    game.loadPgn(pgn);
    const moves = game.history({ verbose: true });
    const last = moves[moves.length - 1];
    return last ? { fen: last.after, before: { fen: last.before, from: last.from, to: last.to } } : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchPuzzle(theme: PuzzleTheme): Promise<Puzzle> {
  const url = theme === "daily" ? "https://lichess.org/api/puzzle/daily" : `https://lichess.org/api/puzzle/next?angle=${theme}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lichess puzzle API error (${res.status})`);
  const j = await res.json();
  const replay = j.game?.pgn ? lead(j.game.pgn) : undefined;
  // Trust the replay only when it lands on the same position as the puzzle.
  const same = replay && replay.fen.split(" ").slice(0, 4).join(" ") === String(j.puzzle.fen).split(" ").slice(0, 4).join(" ");
  return {
    id: j.puzzle.id,
    rating: j.puzzle.rating,
    fen: same ? replay.fen : j.puzzle.fen,
    solution: j.puzzle.solution,
    themes: j.puzzle.themes,
    before: same ? replay.before : undefined,
  };
}
