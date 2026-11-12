// Shared by the page, content script and background worker. Keep it free of imports.
export const LICHESS_RESERVED = new Set([
  "analysis", "training", "practice", "tournament", "streamer", "study", "broadcast",
  "editor", "learn", "coach", "forum", "team", "player", "games", "puzzle", "video",
  "settings", "account", "inbox", "setup", "variant", "opening", "insights", "patron",
]);

const LICHESS = /lichess\.org\/(?:embed\/)?([a-zA-Z0-9]{8})(?:[a-zA-Z0-9]{4})?(?:\/(?:white|black))?(?:[/?#]|$)/;
const CHESSCOM = /chess\.com\/(?:[a-z]{2}\/)?(?:analysis\/)?game\/(?:live|daily|computer)\/\d+/;

export function isGameUrl(url: string): boolean {
  const li = url.match(LICHESS);
  if (li) return !LICHESS_RESERVED.has(li[1]);
  return CHESSCOM.test(url);
}
