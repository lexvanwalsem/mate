import { Side } from "@/lib/stats";
import { t } from "@/lib/i18n";

interface Props {
  headers: Record<string, string>;
  color: Side;
  isYou: boolean;
  accuracy?: number;
}

const clean = (v: string | undefined) => (v && v !== "?" ? v : undefined);

/** One line per player: color chip, name, rating, a "you" tag and optionally accuracy. Fixed height so nothing shifts. */
export default function PlayerBar({ headers, color, isYou, accuracy }: Props) {
  const name = clean(headers[color === "white" ? "White" : "Black"]) ?? t(color === "white" ? "puzzle.white" : "puzzle.black");
  const rating = clean(headers[color === "white" ? "WhiteElo" : "BlackElo"]);
  return (
    <div className={`player-bar ${isYou ? "you" : ""}`}>
      <span className={`chip-color ${color}`} />
      <span className="player-name" title={name}>{name}</span>
      {rating && <span className="player-rating">{rating}</span>}
      {isYou && <span className="you-tag">{t("player.you")}</span>}
      <span className="grow" />
      {accuracy !== undefined && <span className="player-acc">{accuracy.toFixed(1)}%</span>}
    </div>
  );
}
