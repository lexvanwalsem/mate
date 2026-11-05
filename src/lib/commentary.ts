import { GameAnalysis } from "./analyze";
import { MoveClassification as MC } from "@/types/enums";
import { Side, sideOfPosition } from "./stats";
import { uciToSan } from "./chess";

/** What the mascot says about move number `p` (position index 1..n). Spoken from `side`'s point of view. */
export function commentFor(a: GameAnalysis, p: number, side: Side): string {
  const cls = a.positions[p]?.moveClassification;
  if (!cls) return "";

  const mine = sideOfPosition(p) === side;
  const san = a.sans[p - 1];
  const bestUci = a.positions[p - 1].bestMove;
  const best = uciToSan(a.fens[p - 1], bestUci);
  const bestText = best && bestUci !== a.uciMoves[p - 1] ? ` Beter was ${best}.` : "";
  const subject = mine ? "Je speelde" : "Je tegenstander speelde";
  const opening = a.positions[p].opening;

  switch (cls) {
    case MC.Splendid:
      return mine
        ? `${san}! Een briljante zet, je offert iets en het loont. Dit was niet makkelijk te zien.`
        : `${san} is een briljante zet van je tegenstander. Dat kon je niet verwachten.`;
    case MC.Perfect:
      return mine
        ? `${san} is geweldig. Dit was de enige zet die echt werkte.`
        : `${san} is een geweldige zet van je tegenstander. Alleen deze zet hield de stelling bij elkaar.`;
    case MC.Best:
      return `${san} is de beste zet. ${mine ? "Precies wat de computer ook kiest." : "Je tegenstander speelt precies goed."}`;
    case MC.Excellent:
      return `${san} is een uitstekende zet.`;
    case MC.Okay:
      return `${san} is een prima zet.${bestText}`;
    case MC.Opening:
      return opening ? `${san}: een bekende openingszet. ${opening}.` : `${san} is een bekende openingszet.`;
    case MC.Forced:
      return `${san} was de enige zet, dus geen keuze.`;
    case MC.Inaccuracy:
      return `${subject} ${san}, een kleine onnauwkeurigheid.${bestText}`;
    case MC.Mistake:
      return `${subject} ${san}, een fout. Dit kost een flink deel van je voordeel.${bestText}`;
    case MC.Miss:
      return mine
        ? `${san} laat een kans liggen. Je tegenstander gaf je een voordeel en je greep het niet.${bestText}`
        : `${san} laat een kans liggen om je pijn te doen.${bestText}`;
    case MC.Blunder:
      return `${subject} ${san}, een blunder. De stelling kantelt hier.${bestText}`;
  }
}

/** Overall verdict line for the summary card. */
export function verdictFor(accuracy: number): string {
  if (accuracy >= 95) return "Bijna foutloos. Wat een partij!";
  if (accuracy >= 85) return "Sterk gespeeld, een paar details en het was perfect.";
  if (accuracy >= 70) return "Solide partij. Kijk naar de fouten, daar zit winst.";
  if (accuracy >= 50) return "Wisselvallig. Laten we de kantelpunten bekijken.";
  return "Zware partij. Geen zorgen, hier leer je het meest van.";
}
