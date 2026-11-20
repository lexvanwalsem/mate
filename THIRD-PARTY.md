# Third-party code and assets

Mate is free software under the [GNU Affero General Public License v3](LICENSE). It is a modified version of
[Chesskit](https://github.com/GuillaumeSD/Chesskit) and ships the parts below, each under its own license.

## Chesskit (AGPL-3.0)

Mate started from Chesskit by [GuillaumeSD](https://github.com/GuillaumeSD) and changes it since November 2026. These
files are based on Chesskit and carry a note saying so at the top:

| File in Mate | From Chesskit |
|---|---|
| `src/engine/accuracy.ts` | `src/lib/engine/helpers/accuracy.ts` |
| `src/engine/estimateElo.ts` | `src/lib/engine/helpers/estimateElo.ts` (rewritten estimate) |
| `src/engine/moveClassification.ts` | `src/lib/engine/helpers/moveClassification.ts` |
| `src/engine/parseResults.ts` | `src/lib/engine/helpers/parseResults.ts` |
| `src/engine/winPercentage.ts` | `src/lib/engine/helpers/winPercentage.ts` |
| `src/lib/chess.ts` | `src/lib/chess.ts` |
| `src/lib/math.ts` | `src/lib/math.ts` |
| `src/data/openings.ts` | `src/data/openings.ts` |
| `src/types/enums.ts`, `src/types/eval.ts` | `src/types/` |

Everything else in `src/` and `scripts/` is written for Mate and is also AGPL-3.0.

## Stockfish (GPL-3.0)

`public/engines/stockfish-18-lite-single.js` and `.wasm` are
[Stockfish.js](https://github.com/nmrugg/stockfish.js) 18 (c) Chess.com, LLC, licensed GPLv3, based on
[Stockfish](https://github.com/official-stockfish/Stockfish) by T. Romstad, M. Costalba, J. Kiiski, G. Linscott and
other contributors. The source code is available at those two repositories. The build was taken unchanged from Chesskit.

## Piece sets

Taken unchanged from Chesskit, which lists them as below (the same entries as in the Lichess
[COPYING.md](https://github.com/lichess-org/lila/blob/master/COPYING.md)).

| Folder | Author | License |
|---|---|---|
| `public/pieces/blokje` | lexvanwalsem, drawn for Mate by `scripts/make-pieces.mjs` | AGPL-3.0 |
| `public/pieces/cburnett` | [Colin M.L. Burnett](https://en.wikipedia.org/wiki/User:Cburnett) | [GPLv2+](https://www.gnu.org/licenses/gpl-2.0.txt) |
| `public/pieces/merida` | Armando Hernandez Marroquin | [GPLv2+](https://www.gnu.org/licenses/gpl-2.0.txt) |
| `public/pieces/staunty` | sadsnake1 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) (no commercial use) |
| `public/pieces/chessnut` | [Alexis Luengas](https://github.com/LexLuengas) | [Apache 2.0](https://github.com/LexLuengas/chessnut-pieces/blob/master/LICENSE.txt) |
| `public/pieces/fantasy` | [Maurizio Monge](https://github.com/maurimo/chess-art) | [MIT](https://github.com/maurimo/chess-art/blob/main/LICENSE) |
| `public/pieces/spatial` | [Maurizio Monge](https://github.com/maurimo/chess-art) | [MIT](https://github.com/maurimo/chess-art/blob/main/LICENSE) |
| `public/pieces/rhosgfx` | [RhosGFX](https://rhosgfx.itch.io/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `public/pieces/letter` | [usolando](https://lichess.org/@/usolando) | AGPLv3+ |
| `public/pieces/pixel` | therealqtpi | AGPLv3+ |

Blokje the mascot, the icons and the board colours are made for Mate (AGPL-3.0).

## Libraries bundled into the extension

| Package | License |
|---|---|
| [React](https://react.dev) and React DOM | MIT |
| [chess.js](https://github.com/jhlywa/chess.js) | BSD-2-Clause |
| [Fredoka](https://fonts.google.com/specimen/Fredoka) and [Nunito](https://fonts.google.com/specimen/Nunito) via Fontsource | SIL Open Font License 1.1 |

Build and test tools (Vite, TypeScript, tsx, sharp) are not shipped in the extension.

## Data and approaches

- Puzzles are fetched live from the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0) and are not
  stored in this repository.
- Reading Duolingo Chess matches follows the approach of
  [duolingo-chess-history](https://github.com/JohnVitor-Dev/duolingo-chess-history) by John Vitor (MIT). No code was
  copied; Mate has its own implementation.
- Sounds are generated in the browser with the Web Audio API; no sound files are included.
