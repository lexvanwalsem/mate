// chess.com stores the moves of some games (like games against a bot) as "TCN": two characters per move,
// each character one square (or a promotion code). This turns it back into from/to squares.
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?{~}(^)[_]@#$,./&-*++=";
const FILES = "abcdefgh";

export interface TcnMove {
  from: string;
  to: string;
  promotion?: string;
}

const square = (i: number) => FILES[i % 8] + (Math.floor(i / 8) + 1);

export function decodeTcn(tcn: string): TcnMove[] {
  const moves: TcnMove[] = [];
  for (let i = 0; i + 1 < tcn.length; i += 2) {
    const from = ALPHABET.indexOf(tcn[i]);
    let to = ALPHABET.indexOf(tcn[i + 1]);
    let promotion: string | undefined;
    if (to > 63) {
      // promotion: the code says which piece and whether the pawn went straight or took left/right
      promotion = "qnrbkp"[Math.floor((to - 64) / 3)];
      to = from + (from < 16 ? -8 : 8) + ((to - 1) % 3) - 1;
    }
    moves.push({ from: square(from), to: square(to), promotion });
  }
  return moves;
}
