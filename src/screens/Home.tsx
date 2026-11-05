import { HistoryItem } from "@/lib/history";
import { useState } from "react";
import Mascot from "@/ui/Mascot";
import { Settings } from "@/lib/settings";

import { Key, t } from "@/lib/i18n";

interface Props {
  settings: Settings;
  history: HistoryItem[];
  onChangeSettings: (s: Settings) => void;
  onAnalyze: (input: string) => void;
  error?: string;
}

export default function Home({ settings, history, onChangeSettings, onAnalyze, error }: Props) {
  const [input, setInput] = useState("");

  const onFile = async (file?: File) => {
    if (file) onAnalyze(await file.text());
  };

  return (
    <div className="screen home">
      <div className="lang">
        {(["nl", "en"] as const).map((l) => (
          <button key={l} className={settings.lang === l ? "on" : ""} onClick={() => onChangeSettings({ ...settings, lang: l })}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <Mascot mood="happy" size={170} />
      <h1>Zetje</h1>
      <p className="tagline">{t("home.tagline")}</p>

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
        <label>
          {t("home.pieces")}
          <select value={settings.pieceSet} onChange={(e) => onChangeSettings({ ...settings, pieceSet: e.target.value })}>
            {["cburnett", "staunty", "kosal"].map((p) => (
              <option key={p} value={p}>{t(`pieces.${p}` as Key)}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
