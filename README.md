# Zetje (Mate in English)

Free, local chess game analysis as a Chrome extension. Meet Blokje, the block-shaped rook mascot who reviews your games.

- Works on chess.com and lichess: a floating Zetje button is on every page of those sites (it pulses when a game is over). On a game page it analyzes that game, anywhere else it analyzes your latest game (it reads your username from the page, or from the start page settings). The toolbar button does the same, and on other sites it scans the page for a visible or selected PGN or a game link. Everything opens in a new tab
- Everything runs locally with Stockfish 18 (lite, WebAssembly). No server, no account.
- Review is told from your side of the board (your color is at the bottom).
- Move classes: Brilliant, Great, Best, Excellent, Good, Book, Forced, Inaccuracy, Mistake, Miss, Blunder.
- Accuracy, estimated rating, accuracy per game phase, opening name, key moments, eval graph, best lines, recent games, and "Try again" on your mistakes.

## Learn and practice

- **Lessons**: 17 short interactive lessons (pieces, checkmate in one, forks, pins, skewers, opening principles, promotion). Blokje explains, you play. XP, levels and a daily streak are stored locally. `npm run check:lessons` verifies every lesson position and solution with chess.js.
- **Puzzles**: themed puzzles (mate in 1 and 2, fork, pin, skewer, free piece, endgame, opening), fetched live from the free Lichess puzzle API (puzzle data is CC0).
- **My mistakes**: the blunders, mistakes and misses from the games you review become practice positions. Fix one and it leaves your list.

- **Blokje colors**: unlock new mascot colors by leveling up.

## More

- **Draw on the board**: right-drag an arrow, right-click a square (blue; shift red, alt yellow, ctrl green). A left click clears them.
- **Instant explanation**: in puzzles, lessons, training and review practice a wrong move shows your move, the engine's reply as arrows, the dangerous square marked, and a sentence on what it costs.
- **Time per move** from the PGN clocks, **sound effects** (Lichess sounds, with a switch), **daily goal** ring in the header, **daily puzzle**, **annotated PGN export**, a **summary image**, and a **dark mode**.
- **Blokje piece set**: pieces drawn in the mascot's style, the rook is Blokje himself (`npm run make-pieces` regenerates them). With "Pieces react to the board" on, a king in check is shocked, a loose or cheaply attacked piece worries and the piece that just captured is happy (pawns stay calm) (`npm run check:reactions` tests the rules). Piece set, board colors and reactions are in the knight menu in the header on every screen.
- **Review layout**: board, a roomy coach column (explanation, buttons on their own row, evaluation graph, best lines) and the move list in its own column; on narrower windows the move list moves under the coach.
- **Review in the style of a coach**: every move gets a headline ("e6 is excellent") with the evaluation and an explanation told to the player at the bottom of the board ("You castled: your king is safe...", "Your opponent took a knight for free", "This allows Nxe5, which wins a pawn. Better was Nf6."); flip the board to hear the other side. Arrows on the board go with the words (green: the better move, orange: the punishing answer, yellow: a new attack, violet: the plan). The coach also reads the plan from the engine line, played until the position is calm: "The idea: after ... you win a piece" or "... ends in checkmate". "The idea" plays the better move and a few moves after it on the board, "Why bad?" plays how a mistake gets punished, and a big Next moves on. Special moves get a label on the board (Great!, Castles, Check), captured pieces and the material lead show next to each player, and the end of the game is unmistakable: a crown on the winner's king, the reason on the loser's (checkmate, time out, resigned, stalemate, draw) and the result in the move list (`npm run test:ending`).
- **chess.com games against bots** (`/game/computer/...` and the review page of such a game) load with the real names and every move: chess.com stores them as TCN, which Mate decodes (`npm run check:tcn`, `npm run check:chesscom-bot`).
- **Duolingo Chess**: on duolingo.com/chess-matches every match gets an Analyze button; one click turns it into a PGN and opens the analysis from your side. The toolbar button there analyzes your latest match. The way to read the matches follows [duolingo-chess-history](https://github.com/JohnVitor-Dev/duolingo-chess-history) by John Vitor (MIT) (`npm run check:duolingo`, `npm run test:duolingo` runs against a stand-in page, no login).
- **Your latest games**: enter your usernames and the home screen lists your newest games from lichess and chess.com (result, opponent, rating, speed, date); one click analyzes a game from your side. Under the field it says on which site each name was found (`npm run test:online`, needs internet).
- **One clear flow for lessons, puzzles and training**: a card with three steps (your task, your move, why it works), who is to move, the task in bold. A wrong move stays on the board with arrows and an explanation until you press Try again; a puzzle starts one move earlier so you see the opponent's move first, pieces glide between positions, a green or red sign lands on the board at your move, and the opponent answers calmly with a note (`npm run test:puzzle`); after a right training move you can watch the engine's follow-up played move by move (`npm run test:train`).
- **Puzzles** keep a session score (solved, in a row, best streak) and can be skipped, like training positions.

## Build and install

```bash
npm install
npm run build
```

Open `chrome://extensions`, enable Developer mode, choose "Load unpacked" and select the `dist` folder.

## Test

`npm run check:lessons` validates the lessons. `npm run test:ext -- "<path to chrome.exe>" dist` loads the built extension in a headless browser and runs a full Stockfish analysis inside it (no server needed).

## Tests

`npm run test:explore`, `test:practice`, `test:clocks`, `test:fit`, `test:audit` and `test:ext` drive the built extension in a headless Chrome.

## Notes

- Opponent and own color: the content script reads the board orientation. For pasted PGNs set your usernames on the start page, or pick a side on the summary.
- "Miss" is a heuristic: the opponent erred, you were clearly better, and your move gave up 5 percent or more win chance.
- The UI is bilingual (Dutch and English, switch on the start page; defaults to the browser language). All code and comments are English.

## Credits and license

Fonts: [Fredoka](https://fonts.google.com/specimen/Fredoka) and [Nunito](https://fonts.google.com/specimen/Nunito), both SIL Open Font License, bundled via Fontsource. Puzzles come from the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0).

Built on [Chesskit](https://github.com/GuillaumeSD/Chesskit) by GuillaumeSD (engine helpers, move classification, accuracy and rating estimation, openings data, Stockfish builds, piece sets). Licensed under AGPL-3.0, see `LICENSE` and `CHESSKIT-COPYING.md` for third-party piece set licenses.
