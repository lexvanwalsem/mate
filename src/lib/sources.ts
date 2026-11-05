import { t } from "./i18n";
import { LICHESS_RESERVED } from "./gameUrl";
import { Chess } from "chess.js";

export type GameSource = "lichess" | "chesscom" | "pgn";

export interface LoadedGame {
  pgn: string;
  source: GameSource;
  url?: string;
  /** Side the user played, when the source can tell. */
  side?: "white" | "black";
}


export const looksLikePgn = (s: string) =>
  /\[(Event|White|Black|Site)\s+"/.test(s) || /(^|\s)1\.\s*[a-hNBRQKO]/.test(s.trim());

export function validatePgn(pgn: string): string {
  const chess = new Chess();
  chess.loadPgn(pgn);
  if (chess.history().length < 2) throw new Error(t("err.short"));
  return chess.pgn();
}

async function fetchLichess(id: string, side?: "white" | "black"): Promise<LoadedGame> {
  const res = await fetch(`https://lichess.org/game/export/${id}?clocks=true&opening=true&literate=false`, {
    headers: { Accept: "application/x-chess-pgn" },
  });
  if (!res.ok) throw new Error(t("err.lichess", { status: res.status }));
  return { pgn: await res.text(), source: "lichess", url: `https://lichess.org/${id}`, side };
}

interface ChessComArchiveGame { url: string; pgn?: string }

async function fetchChessCom(kind: "live" | "daily", id: string, side?: "white" | "black"): Promise<LoadedGame> {
  const cb = await fetch(`https://www.chess.com/callback/${kind}/game/${id}`);
  if (!cb.ok) throw new Error(t("err.chesscom", { status: cb.status }));
  const data = await cb.json();
  const headers = data?.pgnHeaders ?? {};
  const white: string | undefined = headers.White;
  const black: string | undefined = headers.Black;
  const dateStr: string | undefined = headers.Date ?? headers.UTCDate;
  const endTime: number | undefined = data?.game?.endTime;

  // Date -> archive month(s); also try neighbouring months for timezone edges.
  const base = endTime ? new Date(endTime * 1000) : dateStr ? new Date(dateStr.replace(/\./g, "-")) : new Date();
  const months = new Set<string>();
  for (const delta of [0, -1, 1]) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + delta, 1));
    months.add(`${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  for (const user of [white, black].filter(Boolean) as string[]) {
    for (const ym of months) {
      const r = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games/${ym}`);
      if (!r.ok) continue;
      const j: { games?: ChessComArchiveGame[] } = await r.json();
      const hit = j.games?.find((g) => g.url?.endsWith(`/${id}`) && g.pgn);
      if (hit?.pgn) return { pgn: hit.pgn, source: "chesscom", url: hit.url, side };
    }
  }
  throw new Error(t("err.chesscomPgn"));
}

/** Turn a URL or PGN text into a game. */
export async function loadGame(input: string, sideHint?: "white" | "black"): Promise<LoadedGame> {
  const text = input.trim();
  if (!text) throw new Error(t("err.empty"));

  if (looksLikePgn(text) && !/^https?:\/\//i.test(text)) {
    return { pgn: validatePgn(text), source: "pgn", side: sideHint };
  }

  const url = text.match(/https?:\/\/\S+/)?.[0] ?? text;

  const li = url.match(/lichess\.org\/(?:embed\/)?([a-zA-Z0-9]{8})(?:[a-zA-Z0-9]{4})?(?:\/(white|black))?(?:[/?#]|$)/);
  if (li && !LICHESS_RESERVED.has(li[1])) {
    const g = await fetchLichess(li[1], (li[2] as "white" | "black" | undefined) ?? sideHint);
    return { ...g, pgn: validatePgn(g.pgn) };
  }

  const cc = url.match(/chess\.com\/(?:[a-z]{2}\/)?(?:analysis\/)?game\/(live|daily)\/(\d+)/)
    ?? url.match(/chess\.com\/(?:[a-z]{2}\/)?(live|daily)(?:\/game)?\/(?:game\/)?(\d+)/);
  if (cc) {
    const g = await fetchChessCom(cc[1] as "live" | "daily", cc[2], sideHint);
    return { ...g, pgn: validatePgn(g.pgn) };
  }

  throw new Error(t("err.unknown"));
}
