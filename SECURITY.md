# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private vulnerability reporting
(the "Security" tab of this repository, then "Report a vulnerability").

Include what you found, how to reproduce it and what the impact could be. You will get a reply as soon as possible.

## What the extension does and does not do

- The analysis runs in your browser (Stockfish as WebAssembly). Your games, settings and progress stay in the browser's
  local storage.
- It only makes requests to fetch the game you asked for or your recent games (lichess.org, chess.com, duolingo.com)
  and puzzles from the Lichess puzzle API. There is no server of its own, no account and no analytics.
- On duolingo.com it reads your chess matches through the page you are already logged in to. It never sees or stores
  your password or session cookies.
- Content scripts run only on lichess.org, chess.com and duolingo.com, to show the "Check with Mate" button and find
  the game on the page.
