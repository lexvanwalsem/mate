# Contributing

Thanks for wanting to help. Pull requests are welcome.

## How changes are accepted

- The `main` branch is protected. Nobody pushes to it directly.
- Every change goes through a pull request that the maintainer reviews and approves before merging.
- The automated tests must pass.

## Before you open a pull request

1. Open an issue first for anything bigger than a small fix, so we agree on the direction.
2. Fork the repository, create a branch, make your change.
3. Run the checks: `npm test` (Node.js 20 or newer). It type-checks the code and runs the logic checks
   (lessons, piece reactions, the material check, Duolingo and chess.com move decoding).
4. For changes to screens or the board, also run the end-to-end tests in a real Chrome, for example
   `node scripts/test-ending.mjs "<path to chrome.exe>" "<absolute path to dist>"` after `npm run build`.
   The README lists them all.
5. Add or update a check for the behaviour you change. Pure logic lives in `src/lib/` and `src/engine/` and is easy to
   test without a browser.
6. Keep it simple: no new dependencies unless there is no other way, no servers, no tracking.
7. Raise the `version` in `package.json` and `public/manifest.json` when the change is visible to users.

## Style

- English for code and comments. Interface text goes through `src/lib/i18n.ts`, in both English and Dutch.
- Small functions, clear names, comments that explain why.
- Everything runs on the user's computer. Only fetch from the sites a game comes from (lichess, chess.com, Duolingo)
  and the Lichess puzzle API.
- Credit borrowed work in the README and keep its license (Chesskit is AGPL-3.0).

## Reporting a bug

Open an issue with the Chrome version, the game (a link or the PGN), the move, what you expected and what happened.
A screenshot helps.
