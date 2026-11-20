// Based on Chesskit (https://github.com/GuillaumeSD/Chesskit), AGPL-3.0. Modified for Mate since November 2026.
import { Chess, PieceSymbol, Square } from "chess.js";
import { LineEval, PositionEval } from "@/types/eval";
import { getPositionWinPercentage } from "@/engine/winPercentage";

// Parts of this file are taken from Chesskit (AGPL-3.0), src/lib/chess.ts.

export const uciMoveParams = (uciMove: string) => ({
  from: uciMove.slice(0, 2) as Square,
  to: uciMove.slice(2, 4) as Square,
  promotion: uciMove.slice(4, 5) || undefined,
});

export const getIsStalemate = (fen: string): boolean => new Chess(fen).isStalemate();

export const getWhoIsCheckmated = (fen: string): "w" | "b" | null => {
  const game = new Chess(fen);
  if (!game.isCheckmate()) return null;
  return game.turn();
};

export const moveLineUciToSan = (fen: string): ((moveUci: string) => string) => {
  const game = new Chess(fen);
  return (moveUci: string): string => {
    try {
      return game.move(uciMoveParams(moveUci)).san;
    } catch {
      return moveUci;
    }
  };
};

export const uciToSan = (fen: string, uci: string | undefined): string | undefined => {
  if (!uci) return undefined;
  try {
    return new Chess(fen).move(uciMoveParams(uci)).san;
  } catch {
    return undefined;
  }
};

export const isSimplePieceRecapture = (fen: string, uciMoves: [string, string]): boolean => {
  const game = new Chess(fen);
  const moves = uciMoves.map((m) => uciMoveParams(m));
  if (moves[0].to !== moves[1].to) return false;
  return !!game.get(moves[0].to);
};

export const getIsPieceSacrifice = (fen: string, playedMove: string, bestLinePvToPlay: string[]): boolean => {
  if (!bestLinePvToPlay.length) return false;

  const game = new Chess(fen);
  const whiteToPlay = game.turn() === "w";
  const startingMaterialDifference = getMaterialDifference(fen);

  let moves = [playedMove, ...bestLinePvToPlay];
  if (moves.length % 2 === 1) moves = moves.slice(0, -1);
  let nonCapturingMovesTemp = 1;

  const capturedPieces: { w: PieceSymbol[]; b: PieceSymbol[] } = { w: [], b: [] };
  for (const move of moves) {
    try {
      const fullMove = game.move(uciMoveParams(move));
      if (fullMove.captured) {
        capturedPieces[fullMove.color].push(fullMove.captured);
        nonCapturingMovesTemp = 1;
      } else {
        nonCapturingMovesTemp--;
        if (nonCapturingMovesTemp < 0) break;
      }
    } catch {
      return false;
    }
  }

  for (const p of capturedPieces["w"].slice(0)) {
    if (capturedPieces["b"].includes(p)) {
      capturedPieces["b"].splice(capturedPieces["b"].indexOf(p), 1);
      capturedPieces["w"].splice(capturedPieces["w"].indexOf(p), 1);
    }
  }

  if (
    Math.abs(capturedPieces["w"].length - capturedPieces["b"].length) <= 1 &&
    capturedPieces["w"].concat(capturedPieces["b"]).every((p) => p === "p")
  ) {
    return false;
  }

  const materialDiff = getMaterialDifference(game.fen()) - startingMaterialDifference;
  return (whiteToPlay ? materialDiff : -materialDiff) < 0;
};

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const getMaterialDifference = (fen: string): number =>
  new Chess(fen)
    .board()
    .flat()
    .reduce((acc, sq) => {
      if (!sq) return acc;
      return acc + (sq.color === "w" ? 1 : -1) * PIECE_VALUE[sq.type];
    }, 0);

/** Non-pawn material of both sides combined. */
export const getPieceMaterial = (fen: string): number => {
  const placement = fen.split(" ")[0];
  let total = 0;
  for (const ch of placement) {
    const v = PIECE_VALUE[ch.toLowerCase()];
    if (v && ch.toLowerCase() !== "p") total += v;
  }
  return total;
};

export const getLineEvalLabel = (line: Pick<LineEval, "cp" | "mate">): string => {
  if (line.mate) return `${line.mate > 0 ? "+" : "-"}M${Math.abs(line.mate)}`;
  if (line.cp !== undefined) return `${line.cp > 0 ? "+" : ""}${(line.cp / 100).toFixed(2)}`;
  return "0.00";
};

export const getEvaluationBar = (position: PositionEval): { whitePct: number; label: string } => {
  const whitePct = getPositionWinPercentage(position);
  const best = position.lines[0];
  if (best.mate) return { whitePct, label: `M${Math.abs(best.mate)}` };
  const p = Math.abs(best.cp ?? 0) / 100;
  let label = p.toFixed(1);
  if (label.length > 3) label = p.toFixed(0);
  return { whitePct, label };
};

export const formatUciPv = (fen: string, uciMoves: string[]): string[] => {
  const castling = fen.split(" ")[2];
  let wK = castling.includes("K");
  let wQ = castling.includes("Q");
  let bK = castling.includes("k");
  let bQ = castling.includes("q");

  return uciMoves.map((uci) => {
    if (uci === "e1h1" && wK) { wK = false; return "e1g1"; }
    if (uci === "e1a1" && wQ) { wQ = false; return "e1c1"; }
    if (uci === "e8h8" && bK) { bK = false; return "e8g8"; }
    if (uci === "e8a8" && bQ) { bQ = false; return "e8c8"; }
    return uci;
  });
};
