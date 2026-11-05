import { Side } from "@/lib/stats";
import { t } from "@/lib/i18n";

interface Props {
  headers: Record<string, string>;
  color: Side;
  isYou: boolean;
  accuracy?: number;
  /** When set the whole bar is a button, used to pick which player you are. */
  onClick?: () => void;
}

const clean = (v: string | undefined) => (v && v !== "?" ? v : undefined);

/** One line per player: color chip, name, rating, a "you" tag and optionally accuracy. Fixed height so nothing shifts. */
export default function PlayerBar({ headers, color, isYou, accuracy, onClick }: Props) {
  const name = clean(headers[color === "white" ? "White" : "Black"]) ?? t(color === "white" ? "puzzle.white" : "puzzle.black");
  const rating = clean(headers[color === "white" ? "WhiteElo" : "BlackElo"]);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`player-bar ${isYou ? "you" : ""} ${onClick ? "clickable" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <span className={`chip-color ${color}`} />
      <span className="player-name" title={name}>{name}</span>
      {rating && <span className="player-rating">{rating}</span>}
      {isYou && <span className="you-tag">{t("player.you")}</span>}
      <span className="grow" />
      {accuracy !== undefined && <span className="player-acc">{accuracy.toFixed(1)}%</span>}
    </Tag>
  );
}
