import { HistoryItem } from "@/lib/history";
import { useState } from "react";
import Mascot from "@/ui/Mascot";
import { BOARD_THEMES, MASCOT_THEMES, PIECE_SETS, Settings } from "@/lib/settings";

import { Key, t } from "@/lib/i18n";

interface Props {
  settings: Settings;
  history: HistoryItem[];
  level: number;
  onChangeSettings: (s: Settings) => void;
  onAnalyze: (input: string) => void;
  error?: string;
}

export default function Home({ settings, history, level, onChangeSettings, onAnalyze, error }: Props) {
  const [input, setInput] = useState("");

  const onFile = async (file?: File) => {
    if (file) onAnalyze(await file.text());
  };

  return (
    <div className="screen home">
      <div className="home-left">
      <div className="home-title">
        <Mascot mood="happy" size={120} />
        <div>
          <h1>Zetje</h1>
          <p className="tagline">{t("home.tagline")}</p>
        </div>
      </div>

      <div
        className="card dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files[0]);
        }}
      >
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("home.placeholder")} rows={5} />
        <div className="row">
          <button className="btn primary" disabled={!input.trim()} onClick={() => onAnalyze(input)}>
            {t("home.analyze")}
          </button>
          <label className="btn ghost">
            {t("home.pickFile")}
            <input type="file" accept=".pgn,.txt" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {history.length > 0 && (
        <div className="card history">
          <h3>{t("home.recent")}</h3>
          {history.map((h) => (
            <button key={h.pgn} onClick={() => onAnalyze(h.pgn)}>{h.title}</button>
          ))}
        </div>
      )}

      </div>
      <div className="card settings">
        <label>
          {t("home.usernames")}
          <input
            value={settings.usernames}
            placeholder={t("home.usernamesHint")}
            onChange={(e) => onChangeSettings({ ...settings, usernames: e.target.value })}
          />
        </label>
        <label>
          {t("home.depth", { n: settings.depth })}
          <input
            type="range"
            min={8}
            max={20}
            value={settings.depth}
            onChange={(e) => onChangeSettings({ ...settings, depth: Number(e.target.value) })}
          />
        </label>
        <div className="swatches">
          <span className="picker-label">{t("home.mascot")}</span>
          <div className="row">
            {MASCOT_THEMES.map((m) => (
              <button
                key={m.id}
                className={`swatch ${settings.mascot === m.id ? "on" : ""}`}
                style={{ background: m.swatch }}
                disabled={level < m.unlockLevel}
                title={level < m.unlockLevel ? t("home.unlockAt", { n: m.unlockLevel }) : m.id}
                onClick={() => onChangeSettings({ ...settings, mascot: m.id })}
              />
            ))}
          </div>
        </div>
        <div className="swatches">
          <span className="picker-label">{t("home.pieces")}</span>
          <div className="piece-grid">
            {PIECE_SETS.map((p) => (
              <button key={p.id} className={`piece-opt ${settings.pieceSet === p.id ? "on" : ""}`} onClick={() => onChangeSettings({ ...settings, pieceSet: p.id })}>
                <img alt="" src={`pieces/${p.id}/wN.svg`} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="swatches">
          <span className="picker-label">{t("home.board")}</span>
          <div className="board-opts">
            {BOARD_THEMES.map((b) => (
              <button
                key={b.id}
                className={`board-opt ${settings.boardTheme === b.id ? "on" : ""}`}
                style={{ background: `linear-gradient(135deg, ${b.light} 50%, ${b.dark} 50%)` }}
                onClick={() => onChangeSettings({ ...settings, boardTheme: b.id })}
                aria-label={b.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
