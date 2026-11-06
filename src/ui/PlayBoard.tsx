import { useMemo, useRef, useState } from "react";
import { Chess, Square } from "chess.js";
import Board, { Arrow, BoardPiece, SquareMark, piecesFromFen } from "./Board";
import { Side } from "@/lib/stats";
import { MoveClassification } from "@/types/enums";

interface Props {
  fen: string;
  orientation: Side;
  pieceSet: string;
  /** Called with the uci move (promotion defaults to queen unless the lesson says otherwise). */
  onMove: (uci: string) => void;
  disabled?: boolean;
  arrows?: Arrow[];
  marks?: SquareMark[];
  lastMove?: { from: string; to: string };
  /** A sign on a square, e.g. a green star for a right move and a red mark for a wrong one. */
  badge?: { square: string; cls: MoveClassification };
  effect?: "great" | "good" | "bad";
}

let fresh = 0;

/**
 * Gives the pieces of a new position the ids they had in the previous one, so a moved piece glides
 * to its new square instead of popping up there. Pieces that are gone were captured.
 */
function carryIds(prev: BoardPiece[], next: BoardPiece[]): { pieces: BoardPiece[]; gone: BoardPiece[] } {
  const left = [...prev];
  const take = (match: (o: BoardPiece) => boolean) => {
    const i = left.findIndex(match);
    return i < 0 ? undefined : left.splice(i, 1)[0];
  };
  const stayed = next.map((p) => take((o) => o.square === p.square && o.type === p.type && o.color === p.color));
  const pieces = next.map((p, i) => {
    const old = stayed[i] ?? take((o) => o.color === p.color && o.type === p.type) ?? take((o) => o.color === p.color && o.type === "p");
    return { ...p, id: old?.id ?? `g${fresh++}` };
  });
  return { pieces, gone: left };
}

/** Click or drag to move. Pieces glide between positions, so you can follow what happens. */
export default function PlayBoard({ fen, orientation, pieceSet, onMove, disabled, arrows, marks, lastMove, badge, effect }: Props) {
  const [selected, setSelected] = useState<string>();
  const chess = useMemo(() => new Chess(fen), [fen]);
  const prev = useRef<BoardPiece[]>([]);
  const { pieces, captured } = useMemo(() => {
    const { pieces, gone } = carryIds(prev.current, piecesFromFen(fen));
    prev.current = pieces;
    return { pieces, captured: gone.length === 1 && lastMove && gone[0].square === lastMove.to ? gone[0] : undefined };
  }, [fen]);

  const legal = selected ? chess.moves({ square: selected as Square, verbose: true }) : [];

  const click = (sq: string) => {
    if (disabled) return;
    const hit = legal.find((m) => m.to === sq);
    if (hit) {
      setSelected(undefined);
      onMove(hit.from + hit.to + (hit.promotion ?? ""));
      return;
    }
    const piece = chess.get(sq as Square);
    setSelected(piece && piece.color === chess.turn() ? sq : undefined);
  };

  return (
    <Board
      pieces={pieces}
      orientation={orientation}
      pieceSet={pieceSet}
      arrows={arrows}
      marks={marks}
      lastMove={lastMove}
      animKey={fen}
      captured={captured}
      badge={badge}
      effect={effect}
      highlight={effect === "bad" ? "#ff6b6b" : effect ? "#22c58b" : undefined}
      selected={selected}
      targets={legal.map((m) => m.to)}
      onSquareClick={click}
      canDrag={(sq) => {
        const piece = chess.get(sq as Square);
        return !disabled && !!piece && piece.color === chess.turn();
      }}
      onDragStart={(sq) => setSelected(sq)}
      onDragMove={(from, to) => {
        setSelected(undefined);
        const hit = chess.moves({ square: from as Square, verbose: true }).find((m) => m.to === to);
        if (hit) onMove(hit.from + hit.to + (hit.promotion ?? ""));
      }}
    />
  );
}
