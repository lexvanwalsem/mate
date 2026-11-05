import Mascot from "@/ui/Mascot";
import ClassBadge from "@/ui/ClassBadge";
import { CLASS_META, Mood } from "@/ui/classes";
import { GameAnalysis } from "@/lib/analyze";
import { CLASS_ORDER, Side, countClasses, keyMoments, resultFor } from "@/lib/stats";
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
  const resultText = { win: "Gewonnen", loss: "Verloren", draw: "Remise", unknown: "" }[result];

  return (
    <div className="screen summary">
      <div className="card hero">
        <Mascot mood={moodFor(mine)} size={150} />
        <div>
          <div className="hero-sub">
            {a.headers.White} tegen {a.headers.Black} {resultText && <span className={`pill ${result}`}>{resultText}</span>}
          </div>
          <h2>{verdictFor(mine)}</h2>
          {!sideKnown && <p className="muted">Ik weet niet aan welke kant jij zat. Kies hieronder.</p>}
          <div className="seg">
            <button className={side === "white" ? "on" : ""} onClick={() => onSideChange("white")}>Ik was wit</button>
            <button className={side === "black" ? "on" : ""} onClick={() => onSideChange("black")}>Ik was zwart</button>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="card stat accent">
          <div className="stat-num">{mine.toFixed(1)}%</div>
          <div className="stat-label">Jouw nauwkeurigheid</div>
        </div>
        <div className="card stat">
          <div className="stat-num">{opp.toFixed(1)}%</div>
          <div className="stat-label">Tegenstander</div>
        </div>
        {elo && (
          <div className="card stat">
            <div className="stat-num">{Math.round(elo)}</div>
            <div className="stat-label">Geschatte rating</div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Jouw zetten</h3>
        <div className="class-grid">
          {CLASS_ORDER.filter((c) => counts[c] > 0).map((c) => (
            <div key={c} className="class-tile" style={{ background: CLASS_META[c].color }}>
              <span className="class-count">{counts[c]}</span>
              <span className="class-name">{CLASS_META[c].label}</span>
            </div>
          ))}
        </div>
      </div>

      {moments.length > 0 && (
        <div className="card">
          <h3>Sleutelmomenten</h3>
          <ul className="moments">
            {moments.map((m) => (
              <li key={m.position}>
                <button onClick={() => onReview(m.position)}>
                  <ClassBadge cls={m.cls} size={26} />
                  <span>
                    Zet {Math.ceil(m.position / 2)}: {a.sans[m.position - 1]}
                  </span>
                  <span className="muted">{CLASS_META[m.cls].label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row center">
        <button className="btn primary big" onClick={() => onReview()}>Start review</button>
        <button className="btn ghost" onClick={onBack}>Andere partij</button>
      </div>
    </div>
  );
}
