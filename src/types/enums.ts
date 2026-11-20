// Based on Chesskit (https://github.com/GuillaumeSD/Chesskit), AGPL-3.0. Modified for Mate since November 2026.
export enum MoveClassification {
  Splendid = "splendid", // Briljant
  Perfect = "perfect", // Geweldig
  Best = "best",
  Excellent = "excellent",
  Okay = "okay", // Goed
  Opening = "opening", // Boekzet
  Forced = "forced",
  Inaccuracy = "inaccuracy",
  Mistake = "mistake",
  Miss = "miss", // Gemist
  Blunder = "blunder",
}

export enum Color {
  White = "w",
  Black = "b",
}
