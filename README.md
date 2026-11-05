# Zetje

Free, local chess game analysis as a Chrome extension. Meet Blokje, the block-shaped rook mascot who reviews your games.

- Works on chess.com and lichess: a floating Zetje button appears on game pages (it pulses when the game is over) and the toolbar button does the same. Either one opens a new tab that analyzes that game, plus any site via PGN: paste it, drop a file, or right-click a selected PGN.
- Everything runs locally with Stockfish 18 (lite, WebAssembly). No server, no account.
- Review is told from your side of the board (your color is at the bottom).
- Move classes: Brilliant, Great, Best, Excellent, Good, Book, Forced, Inaccuracy, Mistake, Miss, Blunder.
- Accuracy, estimated rating, accuracy per game phase, opening name, key moments, eval graph, best lines, recent games, and "Try again" on your mistakes.

## Learn and practice

- **Lessons**: 17 short interactive lessons (pieces, checkmate in one, forks, pins, skewers, opening principles, promotion). Blokje explains, you play. XP, levels and a daily streak are stored locally. `npm run check:lessons` verifies every lesson position and solution with chess.js.
- **Puzzles**: themed puzzles (mate in 1 and 2, fork, pin, skewer, free piece, endgame, opening), fetched live from the free Lichess puzzle API (puzzle data is CC0).
- **My mistakes**: the blunders, mistakes and misses from the games you review become practice positions. Fix one and it leaves your list.

- **Blokje colors**: unlock new mascot colors by leveling up.

## Build and install

```bash
npm install
npm run build
```

Open `chrome://extensions`, enable Developer mode, choose "Load unpacked" and select the `dist` folder.

## Test

`npm run check:lessons` validates the lessons. `npm run test:ext -- "<path to chrome.exe>" dist` loads the built extension in a headless browser and runs a full Stockfish analysis inside it (no server needed).

## Notes

- Opponent and own color: the content script reads the board orientation. For pasted PGNs set your usernames on the start page, or pick a side on the summary.
- "Miss" is a heuristic: the opponent erred, you were clearly better, and your move gave up 5 percent or more win chance.
- The UI is bilingual (Dutch and English, switch on the start page; defaults to the browser language). All code and comments are English.

## Credits and license

Built on [Chesskit](https://github.com/GuillaumeSD/Chesskit) by GuillaumeSD (engine helpers, move classification, accuracy and rating estimation, openings data, Stockfish builds, piece sets). Licensed under AGPL-3.0, see `LICENSE` and `CHESSKIT-COPYING.md` for third-party piece set licenses.
