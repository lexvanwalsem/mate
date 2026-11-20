// Based on Chesskit (https://github.com/GuillaumeSD/Chesskit), AGPL-3.0. Modified for Mate since November 2026.
import { MoveClassification } from "./enums";

export interface LineEval {
  pv: string[];
  cp?: number;
  mate?: number;
  depth: number;
  multiPv: number;
}

export interface PositionEval {
  bestMove?: string;
  moveClassification?: MoveClassification;
  opening?: string;
  lines: LineEval[];
}

export interface Accuracy {
  white: number;
  black: number;
}

export interface EstimatedElo {
  white: number;
  black: number;
}
