import { t } from "./i18n";
import { LICHESS_RESERVED } from "./gameUrl";
import { Chess } from "chess.js";
import { decodeTcn } from "./tcn";

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

/** A game against a chess.com bot: not in the public archives, but its own page data has the moves (as TCN). */
async function fetchChessComComputer(id: string, side?: "white" | "black"): Promise<LoadedGame> {
  const res = await fetch(`https://www.chess.com/computer/callback/game/${id}`);
  if (!res.ok) throw new Error(t("err.chesscom", { status: res.status }));
  const game = (await res.json())?.game;
  if (!game?.moveList) throw new Error(t("err.chesscomPgn"));
  const headers: Record<string, string | number> = game.pgnHeaders ?? {};
  const board = new Chess(typeof headers.FEN === "string" ? headers.FEN : undefined);
  for (const m of decodeTcn(game.moveList)) board.move(m);
  for (const [k, v] of Object.entries(headers)) board.setHeader(k, String(v));
  return { pgn: board.pgn(), source: "chesscom", url: `https://www.chess.com/game/computer/${id}`, side };
}

/** Which side did `user` play in this PGN? */
function sideOf(pgn: string, user: string): "white" | "black" | undefined {
  const name = user.toLowerCase();
  if (new RegExp(`\[White "${name}"\]`, "i").test(pgn)) return "white";
  if (new RegExp(`\[Black "${name}"\]`, "i").test(pgn)) return "black";
  return undefined;
}

async function latestLichess(user: string): Promise<LoadedGame | undefined> {
  const res = await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=1&clocks=true&opening=true`, {
    headers: { Accept: "application/x-chess-pgn" },
  });
  const pgn = res.ok ? (await res.text()).trim() : "";
  return pgn ? { pgn, source: "lichess", side: sideOf(pgn, user) } : undefined;
}

async function latestChessCom(user: string): Promise<LoadedGame | undefined> {
  const base = `https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games`;
  const list = await fetch(`${base}/archives`);
  if (!list.ok) return undefined;
  const archives: string[] = (await list.json()).archives ?? [];
  // Newest month first; a new month can still be empty.
  for (const url of archives.slice(-3).reverse()) {
    const r = await fetch(url);
    if (!r.ok) continue;
    const games: ChessComArchiveGame[] = (await r.json()).games ?? [];
    const last = [...games].reverse().find((g) => g.pgn);
    if (last?.pgn) return { pgn: last.pgn, source: "chesscom", url: last.url, side: sideOf(last.pgn, user) };
  }
  return undefined;
}

/** "latest:lichess:name" or "latest:chesscom:name": your most recent game. Tries each known username. */
async function loadLatest(spec: string, extraUsers: string[]): Promise<LoadedGame> {
  const [, platform, detected] = spec.split(":");
  const users = [detected, ...extraUsers].map((u) => u?.trim()).filter((u): u is string => !!u);
  if (!users.length) throw new Error(t("err.noUser"));
  for (const user of users) {
    const game = platform === "lichess" ? await latestLichess(user) : await latestChessCom(user);
    if (game) return { ...game, pgn: validatePgn(game.pgn) };
  }
  throw new Error(t("err.noLatest"));
}

/** Turn a URL, PGN text or "latest:..." request into a game. */
export async function loadGame(input: string, sideHint?: "white" | "black", usernames: string[] = []): Promise<LoadedGame> {
  const text = input.trim();
  if (!text) throw new Error(t("err.empty"));
  if (text.startsWith("latest:")) return loadLatest(text, usernames);

  if (looksLikePgn(text) && !/^https?:\/\//i.test(text)) {
    return { pgn: validatePgn(text), source: "pgn", side: sideHint };
  }

  const url = text.match(/https?:\/\/\S+/)?.[0] ?? text;

  const li = url.match(/lichess\.org\/(?:embed\/)?([a-zA-Z0-9]{8})(?:[a-zA-Z0-9]{4})?(?:\/(white|black))?(?:[/?#]|$)/);
  if (li && !LICHESS_RESERVED.has(li[1])) {
    const g = await fetchLichess(li[1], (li[2] as "white" | "black" | undefined) ?? sideHint);
    return { ...g, pgn: validatePgn(g.pgn) };
  }

  const bot = url.match(/chess\.com\/(?:[a-z]{2}\/)?(?:analysis\/)?game\/computer\/(\d+)/);
  if (bot) {
    const g = await fetchChessComComputer(bot[1], sideHint);
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
