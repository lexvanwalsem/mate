// Puzzles come live from the free Lichess puzzle API (puzzle data is CC0).
export interface Puzzle {
  id: string;
  rating: number;
  fen: string; // position with the player to move
  solution: string[]; // uci, player move first, then opponent, and so on
  themes: string[];
}

export const PUZZLE_THEMES = ["daily", "mateIn1", "mateIn2", "fork", "pin", "skewer", "hangingPiece", "endgame", "opening"] as const;
export type PuzzleTheme = (typeof PUZZLE_THEMES)[number];

export async function fetchPuzzle(theme: PuzzleTheme): Promise<Puzzle> {
  const url = theme === "daily" ? "https://lichess.org/api/puzzle/daily" : `https://lichess.org/api/puzzle/next?angle=${theme}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lichess puzzle API error (${res.status})`);
  const j = await res.json();
  return { id: j.puzzle.id, rating: j.puzzle.rating, fen: j.puzzle.fen, solution: j.puzzle.solution, themes: j.puzzle.themes };
}
