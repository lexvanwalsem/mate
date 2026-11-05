# Zetje

Free, local chess game analysis as a Chrome extension. Meet Blokje, the block-shaped rook mascot who reviews your games.

- Works on chess.com and lichess (floating button on game pages), plus any site via PGN: paste it, drop a file, or right-click a selected PGN.
- Everything runs locally with Stockfish 18 (lite, WebAssembly). No server, no account.
- Review is told from your side of the board (your color is at the bottom).
- Move classes: Brilliant, Great, Best, Excellent, Good, Book, Forced, Inaccuracy, Mistake, Miss, Blunder.
- Accuracy, estimated rating, accuracy per game phase, opening name, key moments, eval graph, best lines, recent games, and "Try again" on your mistakes.

## Build and install

```bash
npm install
npm run build
```

Open `chrome://extensions`, enable Developer mode, choose "Load unpacked" and select the `dist` folder.

## Notes

- Opponent and own color: the content script reads the board orientation. For pasted PGNs set your usernames on the start page, or pick a side on the summary.
- "Miss" is a heuristic: the opponent erred, you were clearly better, and your move gave up 5 percent or more win chance.
- The UI is bilingual (Dutch and English, switch on the start page; defaults to the browser language). All code and comments are English.

## Credits and license

Built on [Chesskit](https://github.com/GuillaumeSD/Chesskit) by GuillaumeSD (engine helpers, move classification, accuracy and rating estimation, openings data, Stockfish builds, piece sets). Licensed under AGPL-3.0, see `LICENSE` and `CHESSKIT-COPYING.md` for third-party piece set licenses.
