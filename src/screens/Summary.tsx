import Mascot from "@/ui/Mascot";
import ClassBadge from "@/ui/ClassBadge";
import { CLASS_META, Mood, classLabel } from "@/ui/classes";
import { GameAnalysis } from "@/lib/analyze";
import { CLASS_ORDER, Side, countClasses, keyMoments, openingName, phaseAccuracy, resultFor } from "@/lib/stats";
import { t, Key } from "@/lib/i18n";
import { verdictFor } from "@/lib/commentary";

interface Props {
  a: GameAnalysis;
  side: Side;
  sideKnown: boolean;
  onSideChange: (s: Side) => void;
  onReview: (position?: number) => void;
  onBack: () => void;
}

const moodFor = (acc: number): Mood => (acc >= 90 ? "proud" : acc >= 75 ? "happy" : acc >= 55 ? "thinking" : "worried");

export default function Summary({ a, side, sideKnown, onSideChange, onReview, onBack }: Props) {
  const mine = a.accuracy[side];
  const opp = a.accuracy[side === "white" ? "black" : "white"];
  const counts = countClasses(a, side);
  const moments = keyMoments(a, side);
  const elo = a.estimatedElo?.[side];
  const result = resultFor(a.headers, side);
  const resultText = result === "unknown" ? "" : t(`summary.${result}` as Key);
  const phases = phaseAccuracy(a, side);
  const opening = openingName(a);

  return (
    <div className="screen summary">
      <div className="card hero">
        <Mascot mood={moodFor(mine)} size={150} />
        <div>
          <div className="hero-sub">
            {t("summary.vs", { white: a.headers.White, black: a.headers.Black })} {resultText && <span className={`pill ${result}`}>{resultText}</span>}
          </div>
          <h2>{verdictFor(mine)}</h2>
          {!sideKnown && <p className="muted">{t("summary.pickSide")}</p>}
          <div className="seg">
            <button className={side === "white" ? "on" : ""} onClick={() => onSideChange("white")}>{t("summary.iWhite")}</button>
            <button className={side === "black" ? "on" : ""} onClick={() => onSideChange("black")}>{t("summary.iBlack")}</button>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="card stat accent">
          <div className="stat-num">{mine.toFixed(1)}%</div>
          <div className="stat-label">{t("summary.accuracy")}</div>
        </div>
        <div className="card stat">
          <div className="stat-num">{opp.toFixed(1)}%</div>
          <div className="stat-label">{t("summary.opponent")}</div>
        </div>
        {elo && (
          <div className="card stat">
            <div className="stat-num">{Math.round(elo)}</div>
            <div className="stat-label">{t("summary.elo")}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>{t("summary.phases")}</h3>
        <div className="phases">
          {(["opening", "middlegame", "endgame"] as const).map((p) =>
            phases[p] === undefined ? null : (
              <div key={p} className="phase">
                <span>{t(`phase.${p}` as Key)}</span>
                <div className="phase-bar"><div style={{ width: `${phases[p]}%` }} /></div>
                <b>{phases[p]!.toFixed(0)}%</b>
              </div>
            )
          )}
        </div>
        {opening && <p className="muted">{t("summary.opening")}: {opening}</p>}
      </div>

      <div className="card">
        <h3>{t("summary.moves")}</h3>
        <div className="class-grid">
          {CLASS_ORDER.filter((c) => counts[c] > 0).map((c) => (
            <div key={c} className="class-tile" style={{ background: CLASS_META[c].color }}>
              <span className="class-count">{counts[c]}</span>
              <span className="class-name">{classLabel(c)}</span>
            </div>
          ))}
        </div>
      </div>

      {moments.length > 0 && (
        <div className="card">
          <h3>{t("summary.moments")}</h3>
          <ul className="moments">
            {moments.map((m) => (
              <li key={m.position}>
                <button onClick={() => onReview(m.position)}>
                  <ClassBadge cls={m.cls} size={26} />
                  <span>
                    {t("summary.moveN", { n: Math.ceil(m.position / 2), san: a.sans[m.position - 1] })}
                  </span>
                  <span className="muted">{classLabel(m.cls)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row center">
        <button className="btn primary big" onClick={() => onReview()}>{t("summary.review")}</button>
        <button className="btn ghost" onClick={onBack}>{t("summary.another")}</button>
      </div>
    </div>
  );
}
