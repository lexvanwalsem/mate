import { Side } from "./stats";

/** One of your recent online games, ready to analyze with one click. */
export interface RecentGame {
  key: string;
  platform: "lichess" | "chesscom";
  pgn: string;
  you: Side;
  opponent: string;
  opponentRating?: string;
  result: "win" | "loss" | "draw" | "unknown";
  date: number; // ms since epoch, for sorting
  speed?: string; // bullet, blitz, rapid ...
}

export interface RecentLookup {
  games: RecentGame[];
  /** For every name: the sites where it was found. */
  found: Record<string, ("lichess" | "chesscom")[]>;
}

const PER_SITE = 6;

// chess.com and lichess refuse parallel requests (429), so every request waits for the one before, with one retry.
let queue: Promise<unknown> = Promise.resolve();
function get(url: string, init?: RequestInit): Promise<Response> {
  const run = async () => {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    await new Promise((r) => setTimeout(r, 1200));
    return fetch(url, init);
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

const headers = (pgn: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of pgn.matchAll(/\[(\w+) "([^"]*)"\]/g)) out[m[1]] = m[2];
  return out;
};

function toGame(pgn: string, user: string, platform: RecentGame["platform"], speed?: string, time?: number): RecentGame | undefined {
  const h = headers(pgn);
  const name = user.toLowerCase();
  const you: Side | undefined = h.White?.toLowerCase() === name ? "white" : h.Black?.toLowerCase() === name ? "black" : undefined;
  if (!you) return undefined;
  const r = h.Result;
  const result = r === "1/2-1/2" ? "draw" : r === "1-0" ? (you === "white" ? "win" : "loss") : r === "0-1" ? (you === "black" ? "win" : "loss") : "unknown";
  const day = (h.UTCDate ?? h.Date ?? "").replace(/\./g, "-");
  const date = time ?? (Date.parse(`${day}T${h.UTCTime ?? h.EndTime ?? "00:00:00"}Z`) || 0);
  return {
    key: `${platform}:${h.Site ?? h.Link ?? date}`,
    platform,
    pgn,
    you,
    opponent: (you === "white" ? h.Black : h.White) ?? "?",
    opponentRating: you === "white" ? h.BlackElo : h.WhiteElo,
    result,
    date,
    speed: speed ?? h.Event?.match(/bullet|blitz|rapid|classical|correspondence|daily/i)?.[0]?.toLowerCase(),
  };
}

async function fromLichess(user: string): Promise<RecentGame[] | undefined> {
  const res = await get(`https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${PER_SITE}&clocks=true&opening=true`, {
    headers: { Accept: "application/x-chess-pgn" },
  });
  if (!res.ok) return undefined;
  const text = (await res.text()).trim();
  return text
    .split(/\n\s*\n(?=\[Event )/)
    .map((pgn) => toGame(pgn.trim(), user, "lichess"))
    .filter((g): g is RecentGame => !!g);
}

interface ChessComGame { pgn?: string; end_time?: number; time_class?: string }

async function fromChessCom(user: string): Promise<RecentGame[] | undefined> {
  const base = `https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games`;
  const list = await get(`${base}/archives`);
  if (!list.ok) return undefined;
  const archives: string[] = (await list.json()).archives ?? [];
  const out: RecentGame[] = [];
  for (const url of archives.slice(-2).reverse()) {
    const r = await get(url);
    if (!r.ok) continue;
    const games: ChessComGame[] = (await r.json()).games ?? [];
    for (const g of [...games].reverse()) {
      const game = g.pgn ? toGame(g.pgn, user, "chesscom", g.time_class, g.end_time ? g.end_time * 1000 : undefined) : undefined;
      if (game) out.push(game);
      if (out.length >= PER_SITE) return out;
    }
  }
  return out;
}

/** Your latest games on lichess and chess.com for every name you entered, newest first. */
export async function lookupRecent(names: string[], limit = 6): Promise<RecentLookup> {
  const found: RecentLookup["found"] = {};
  const all: RecentGame[] = [];
  for (const name of names) {
    found[name] = [];
    const li = await fromLichess(name).catch(() => undefined);
    const cc = await fromChessCom(name).catch(() => undefined);
    if (li) found[name].push("lichess");
    if (cc) found[name].push("chesscom");
    all.push(...(li ?? []), ...(cc ?? []));
  }
  const unique = [...new Map(all.map((g) => [g.key, g])).values()];
  return { games: unique.sort((a, b) => b.date - a.date).slice(0, limit), found };
}
