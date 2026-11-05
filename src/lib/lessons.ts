import { getLang } from "./i18n";

export interface L { en: string; nl: string }
export const lt = (l: L): string => l[getLang()];

export type Step =
  | { kind: "info"; fen: string; text: L; arrows?: [string, string][] }
  | { kind: "move"; fen: string; text: L; accept: string[]; hint: L; mate?: boolean };

export interface Lesson { id: string; title: L; steps: Step[] }
export interface Unit { id: string; title: L; lessons: Lesson[] }

const info = (fen: string, en: string, nl: string, arrows?: [string, string][]): Step => ({ kind: "info", fen, text: { en, nl }, arrows });
const move = (fen: string, accept: string[], en: string, nl: string, hintEn: string, hintNl: string, mate = false): Step => ({
  kind: "move", fen, accept, text: { en, nl }, hint: { en: hintEn, nl: hintNl }, mate,
});

export const UNITS: Unit[] = [
  {
    id: "pieces",
    title: { en: "The pieces", nl: "De stukken" },
    lessons: [
      {
        id: "rook",
        title: { en: "The rook", nl: "De toren" },
        steps: [
          info("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "The rook moves in straight lines: up, down, left and right, as far as the way is clear.", "De toren beweegt in rechte lijnen: omhoog, omlaag, links en rechts, zo ver de weg vrij is.", [["a1", "a8"]]),
          move("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", ["a1a8"], "Move the rook to the top of the board (a8).", "Zet de toren naar de bovenkant van het bord (a8).", "Straight up the a-file.", "Rechtdoor langs de a-lijn."),
          move("4k3/8/8/3p4/8/8/8/3RK3 w - - 0 1", ["d1d5"], "Capture the black pawn with your rook.", "Sla de zwarte pion met je toren.", "The pawn is on the same file as your rook.", "De pion staat op dezelfde lijn als je toren."),
        ],
      },
      {
        id: "bishop",
        title: { en: "The bishop", nl: "De loper" },
        steps: [
          info("4k3/8/8/8/8/8/8/2B1K3 w - - 0 1", "The bishop moves diagonally and always stays on the same color of squares.", "De loper beweegt diagonaal en blijft altijd op dezelfde kleur velden.", [["c1", "h6"]]),
          move("4k3/8/8/8/8/8/8/2B1K3 w - - 0 1", ["c1h6"], "Move the bishop all the way to h6.", "Zet de loper helemaal naar h6.", "Go up and to the right.", "Ga schuin omhoog naar rechts."),
          move("4k3/8/8/8/5p2/8/8/2B1K3 w - - 0 1", ["c1f4"], "Capture the pawn on f4.", "Sla de pion op f4.", "It is on your diagonal.", "Hij staat op je diagonaal."),
        ],
      },
      {
        id: "queen",
        title: { en: "The queen", nl: "De dame" },
        steps: [
          info("4k3/8/8/8/8/8/8/3QK3 w - - 0 1", "The queen is the strongest piece. She moves like a rook and a bishop together.", "De dame is het sterkste stuk. Ze beweegt als een toren en een loper samen.", [["d1", "d8"], ["d1", "h5"]]),
          move("4k3/8/8/7p/8/8/8/3QK3 w - - 0 1", ["d1h5"], "Capture the pawn on h5 with the queen.", "Sla de pion op h5 met de dame.", "Use the diagonal.", "Gebruik de diagonaal."),
        ],
      },
      {
        id: "knight",
        title: { en: "The knight", nl: "Het paard" },
        steps: [
          info("4k3/8/8/8/8/8/8/1N2K3 w - - 0 1", "The knight jumps in an L shape: two squares one way and one square sideways. It can jump over pieces.", "Het paard springt in een L-vorm: twee velden de ene kant op en een opzij. Het springt over stukken heen.", [["b1", "c3"], ["b1", "a3"], ["b1", "d2"]]),
          move("4k3/8/8/8/8/8/8/1N2K3 w - - 0 1", ["b1c3"], "Jump the knight to c3.", "Spring met het paard naar c3.", "Two up, one to the right.", "Twee omhoog, een naar rechts."),
          move("4k3/8/8/8/8/2p5/8/1N2K3 w - - 0 1", ["b1c3"], "Capture the pawn on c3.", "Sla de pion op c3.", "Same jump as before.", "Dezelfde sprong als net."),
        ],
      },
      {
        id: "pawn",
        title: { en: "The pawn", nl: "De pion" },
        steps: [
          info("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1", "Pawns move forward one square, or two from their starting square. They capture diagonally.", "Pionnen gaan een veld vooruit, of twee vanaf hun beginplek. Ze slaan diagonaal.", [["e2", "e4"]]),
          move("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1", ["e2e4"], "Move the pawn two squares forward.", "Zet de pion twee velden vooruit.", "From e2 to e4.", "Van e2 naar e4."),
          move("4k3/8/8/8/3p4/4P3/8/4K3 w - - 0 1", ["e3d4"], "Capture the pawn on d4.", "Sla de pion op d4.", "Pawns capture diagonally forward.", "Pionnen slaan schuin vooruit."),
        ],
      },
      {
        id: "king",
        title: { en: "The king", nl: "De koning" },
        steps: [
          info("4k3/8/8/8/8/8/8/4K3 w - - 0 1", "The king moves one square in any direction. Protect him: if he cannot escape an attack, the game is lost.", "De koning gaat een veld in elke richting. Bescherm hem: als hij een aanval niet kan ontlopen is de partij verloren.", [["e1", "e2"]]),
          move("4k3/8/8/8/8/8/8/4K3 w - - 0 1", ["e1e2"], "Move your king one square forward.", "Zet je koning een veld vooruit.", "Up to e2.", "Omhoog naar e2."),
        ],
      },
    ],
  },
  {
    id: "mates",
    title: { en: "Checkmate in one", nl: "Mat in een" },
    lessons: [
      {
        id: "back-rank",
        title: { en: "Back rank mate", nl: "Mat op de achterste rij" },
        steps: [
          info("6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1", "A king hiding behind his own pawns can be trapped on the back rank by a rook.", "Een koning achter zijn eigen pionnen kan op de achterste rij door een toren worden vastgezet.", [["a1", "a8"]]),
          move("6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1", ["a1a8"], "Checkmate the black king.", "Zet de zwarte koning mat.", "Use the rook on the back rank.", "Gebruik de toren op de achterste rij.", true),
        ],
      },
      {
        id: "queen-mate",
        title: { en: "Queen and king", nl: "Dame en koning" },
        steps: [
          move("7k/8/5K2/8/8/8/8/6Q1 w - - 0 1", ["g1g7"], "Checkmate. Your king protects the queen.", "Zet mat. Je koning beschermt de dame.", "Put the queen next to the king, protected by your own king.", "Zet de dame naast de koning, beschermd door je eigen koning.", true),
          move("6k1/8/6K1/8/8/8/8/R7 w - - 0 1", ["a1a8"], "Checkmate again, now with a rook.", "Weer mat, nu met een toren.", "Check along the back rank. Your king guards the escape squares.", "Schaak langs de achterste rij. Je koning bewaakt de vluchtvelden.", true),
        ],
      },
      {
        id: "two-rooks",
        title: { en: "Two rooks", nl: "Twee torens" },
        steps: [
          move("7k/R7/8/8/8/8/1R6/4K3 w - - 0 1", ["b2b8"], "One rook cuts off the 7th rank. Use the other to give mate.", "Een toren sluit de zevende rij af. Gebruik de andere voor mat.", "Check on the back rank.", "Geef schaak op de achterste rij.", true),
        ],
      },
      {
        id: "scholars",
        title: { en: "Scholar's mate", nl: "Herdersmat" },
        steps: [
          info("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", "Queen and bishop aim at f7, the weakest point in black's camp. Only the king protects it.", "Dame en loper mikken op f7, het zwakste punt in het zwarte kamp. Alleen de koning beschermt het.", [["h5", "f7"], ["c4", "f7"]]),
          move("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", ["h5f7"], "Checkmate on f7.", "Zet mat op f7.", "The queen takes the pawn, the bishop protects her.", "De dame slaat de pion, de loper beschermt haar.", true),
        ],
      },
    ],
  },
  {
    id: "tactics",
    title: { en: "Tactics", nl: "Tactiek" },
    lessons: [
      {
        id: "fork",
        title: { en: "The fork", nl: "De vork" },
        steps: [
          info("q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", "A fork attacks two pieces at once. Knights are great at it because they jump.", "Een vork valt twee stukken tegelijk aan. Paarden zijn er goed in omdat ze springen.", [["b5", "c7"]]),
          move("q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", ["b5c7"], "Fork the king and the queen.", "Val koning en dame tegelijk aan.", "Look for a square that attacks both e8 and a8.", "Zoek een veld dat zowel e8 als a8 aanvalt."),
        ],
      },
      {
        id: "pin",
        title: { en: "The pin", nl: "De aanpinning" },
        steps: [
          info("4k3/4n3/8/3P4/8/8/8/4RK2 w - - 0 1", "The black knight cannot move: the rook behind it points at the king. That is a pin.", "Het zwarte paard kan niet weg: de toren erachter mikt op de koning. Dat is een aanpinning.", [["e1", "e7"]]),
          move("4k3/4n3/8/3P4/8/8/8/4RK2 w - - 0 1", ["d5d6"], "Attack the pinned knight with your pawn.", "Val het vastgepinde paard aan met je pion.", "A pawn on d6 attacks e7.", "Een pion op d6 valt e7 aan."),
        ],
      },
      {
        id: "skewer",
        title: { en: "The skewer", nl: "Het spiesen" },
        steps: [
          info("1r2k3/8/8/8/8/8/8/4K2R w - - 0 1", "A skewer is a pin the other way around: check the valuable piece, it must move, and you win the piece behind it.", "Spiesen is een aanpinning andersom: geef schaak, de koning moet weg en je wint het stuk erachter.", [["h1", "h8"], ["h8", "b8"]]),
          move("1r2k3/8/8/8/8/8/8/4K2R w - - 0 1", ["h1h8"], "Check the king along the back rank. The rook on b8 is behind him.", "Geef schaak langs de achterste rij. De toren op b8 staat erachter.", "Go to h8.", "Ga naar h8."),
        ],
      },
      {
        id: "pawn-fork",
        title: { en: "The pawn fork", nl: "De pionnenvork" },
        steps: [
          move("4k3/8/8/3r1n2/8/8/4P3/4K3 w - - 0 1", ["e2e4"], "Even a pawn can fork. Attack the rook and the knight at once.", "Zelfs een pion kan vorken. Val de toren en het paard tegelijk aan.", "Pawns attack diagonally forward. Which square hits d5 and f5?", "Pionnen vallen schuin vooruit aan. Welk veld raakt d5 en f5?"),
        ],
      },
      {
        id: "free-piece",
        title: { en: "Take what is free", nl: "Pak wat gratis is" },
        steps: [
          move("4k3/8/8/2n5/8/8/8/2R1K3 w - - 0 1", ["c1c5"], "Black left a knight unprotected. Take it!", "Zwart liet een paard onbeschermd. Pak het!", "Your rook sees it down the c-file.", "Je toren ziet het langs de c-lijn."),
        ],
      },
    ],
  },
  {
    id: "basics",
    title: { en: "Openings and endings", nl: "Opening en eindspel" },
    lessons: [
      {
        id: "opening",
        title: { en: "Opening principles", nl: "Openingsprincipes" },
        steps: [
          move("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", ["e2e4", "d2d4"], "Rule one: take the center. Move a center pawn.", "Regel een: neem het centrum. Zet een centrumpion.", "e4 or d4.", "e4 of d4."),
          move("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", ["g1f3", "b1c3"], "Rule two: develop your knights.", "Regel twee: ontwikkel je paarden.", "Knights belong toward the center.", "Paarden horen richting het centrum."),
          move("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5", ["e1g1"], "Rule three: castle to keep your king safe.", "Regel drie: rokeer om je koning veilig te zetten.", "Move the king two squares toward the rook.", "Zet de koning twee velden richting de toren."),
        ],
      },
      {
        id: "promotion",
        title: { en: "Promotion", nl: "Promotie" },
        steps: [
          move("8/P7/8/8/8/2k5/8/4K3 w - - 0 1", ["a7a8q", "a7a8r"], "A pawn that reaches the last rank becomes a new piece. Promote it.", "Een pion die de laatste rij bereikt wordt een nieuw stuk. Promoveer hem.", "Move the pawn forward one square.", "Zet de pion een veld vooruit."),
        ],
      },
    ],
  },
];

export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons);
export const XP_PER_STEP = 5;
export const XP_PER_LESSON = 20;
