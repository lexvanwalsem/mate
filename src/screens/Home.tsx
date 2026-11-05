import { useState } from "react";
import Mascot from "@/ui/Mascot";
import { Settings } from "@/lib/settings";

interface Props {
  settings: Settings;
  onChangeSettings: (s: Settings) => void;
  onAnalyze: (input: string) => void;
  error?: string;
}

export default function Home({ settings, onChangeSettings, onAnalyze, error }: Props) {
  const [input, setInput] = useState("");

  const onFile = async (file?: File) => {
    if (file) onAnalyze(await file.text());
  };

  return (
    <div className="screen home">
      <Mascot mood="happy" size={170} />
      <h1>Zetje</h1>
      <p className="tagline">Gratis schaakanalyse, lokaal op jouw computer. Blokje kijkt mee.</p>

      <div
        className="card dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files[0]);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Plak een link van chess.com of lichess, of een PGN. Je kunt ook een .pgn-bestand hierheen slepen."
          rows={5}
        />
        <div className="row">
          <button className="btn primary" disabled={!input.trim()} onClick={() => onAnalyze(input)}>
            Analyseer
          </button>
          <label className="btn ghost">
            Kies PGN-bestand
            <input type="file" accept=".pgn,.txt" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card settings">
        <label>
          Mijn gebruikersnamen
          <input
            value={settings.usernames}
            placeholder="bijv. lexvanwalsem, lex123"
            onChange={(e) => onChangeSettings({ ...settings, usernames: e.target.value })}
          />
        </label>
        <label>
          Diepte ({settings.depth})
          <input
            type="range"
            min={8}
            max={20}
            value={settings.depth}
            onChange={(e) => onChangeSettings({ ...settings, depth: Number(e.target.value) })}
          />
        </label>
        <label>
          Stukken
          <select value={settings.pieceSet} onChange={(e) => onChangeSettings({ ...settings, pieceSet: e.target.value })}>
            <option value="cburnett">Klassiek</option>
            <option value="staunty">Staunty</option>
            <option value="kosal">Kosal</option>
          </select>
        </label>
      </div>
    </div>
  );
}
