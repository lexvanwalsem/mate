import { Side } from "@/lib/stats";
import { t } from "@/lib/i18n";
import { formatSeconds } from "@/lib/stats";

interface Props {
  headers: Record<string, string>;
  color: Side;
  isYou: boolean;
  accuracy?: number;
  /** Seconds left on this player's clock. */
  clock?: number;
  /** Opponent pieces this player has taken, and the material lead in pawns. */
  taken?: string[];
  plus?: number;
  pieceSet?: string;
  /** When set the whole bar is a button, used to pick which player you are. */
  onClick?: () => void;
}

const clean = (v: string | undefined) => (v && v !== "?" ? v : undefined);

/** One line per player: color chip, name, rating, a "you" tag, captured pieces, clock and accuracy. Fixed height so nothing shifts. */
export default function PlayerBar({ headers, color, isYou, accuracy, clock, taken, plus, pieceSet, onClick }: Props) {
  const name = clean(headers[color === "white" ? "White" : "Black"]) ?? t(color === "white" ? "puzzle.white" : "puzzle.black");
  const rating = clean(headers[color === "white" ? "WhiteElo" : "BlackElo"]);
  const Tag = onClick ? "button" : "div";
  const theirs = color === "white" ? "b" : "w";
  return (
    <Tag className={`player-bar ${isYou ? "you" : ""} ${onClick ? "clickable" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <span className={`chip-color ${color}`} />
      <span className="player-name" title={name}>{name}</span>
      {rating && <span className="player-rating">{rating}</span>}
      {isYou && <span className="you-tag">{t("player.you")}</span>}
      {pieceSet && taken && taken.length > 0 && (
        <span className="taken" aria-label={t("player.taken")}>
          {taken.map((p, i) => (
            <img key={i} alt="" src={`pieces/${pieceSet}/${theirs}${p.toUpperCase()}.svg`} className={i > 0 && taken[i - 1] === p ? "same" : ""} />
          ))}
          {plus ? <b>+{plus}</b> : null}
        </span>
      )}
      <span className="grow" />
      {clock !== undefined && <span className="player-clock">{formatSeconds(clock)}</span>}
      {accuracy !== undefined && <span className="player-acc">{accuracy.toFixed(1)}%</span>}
    </Tag>
  );
}
