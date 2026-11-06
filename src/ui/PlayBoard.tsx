import { useMemo, useState } from "react";
import { Chess, Square } from "chess.js";
import Board, { Arrow, SquareMark, piecesFromFen } from "./Board";
import { Side } from "@/lib/stats";

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
}

/** Click-to-move board: click a piece, then a highlighted square. */
export default function PlayBoard({ fen, orientation, pieceSet, onMove, disabled, arrows, marks, lastMove }: Props) {
  const [selected, setSelected] = useState<string>();
  const chess = useMemo(() => new Chess(fen), [fen]);
  const pieces = useMemo(() => piecesFromFen(fen), [fen]);

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
