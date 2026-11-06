import { HistoryItem } from "@/lib/history";
import { useEffect, useState } from "react";
import { RecentLookup, lookupRecent } from "@/lib/recentGames";
import { BOARD_THEMES, MASCOT_THEMES, PIECE_SETS, Settings } from "@/lib/settings";
import { REACTING_SETS } from "@/lib/reactions";

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
  // Your latest online games, looked up shortly after you stop typing your names.
  const [online, setOnline] = useState<RecentLookup & { loading: boolean }>();
  const names = settings.usernames.split(",").map((n) => n.trim()).filter(Boolean);
  const namesKey = names.join(",");
  useEffect(() => {
    if (!names.length) {
      setOnline(undefined);
      return;
    }
    let live = true;
    setOnline((o) => ({ games: o?.games ?? [], found: o?.found ?? {}, loading: true }));
    const timer = window.setTimeout(async () => {
      const res = await lookupRecent(names);
      if (live) setOnline({ ...res, loading: false });
    }, 700);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [namesKey]);
  const site = (p: string) => (p === "lichess" ? "lichess" : "chess.com");
  const foundText = online && !online.loading
    ? names
        .map((n) => (online.found[n]?.length ? t("home.foundOn", { name: n, sites: online.found[n].map(site).join(" + ") }) : t("home.notFound", { name: n })))
        .join(" · ")
    : undefined;

  const onFile = async (file?: File) => {
    if (file) onAnalyze(await file.text());
  };

  return (
    <div className="screen home">
      <div className="home-left">
      <div className="home-title">
        <h1>{t("home.title")}</h1>
        <p className="tagline">{t("home.tagline")}</p>
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

      {online && (
        <div className="card online">
          <h3>{t("home.online")}</h3>
          {online.loading && !online.games.length && <p className="muted">{t("home.onlineLoading")}</p>}
          {!online.loading && !online.games.length && <p className="muted">{t("home.onlineEmpty")}</p>}
          {online.games.map((g) => (
            <button key={g.key} className="online-game" onClick={() => onAnalyze(g.pgn)}>
              <span className={`result-pill ${g.result}`}>{g.result === "unknown" ? "?" : t(`summary.${g.result}` as Key)}</span>
              <span className={`chip-color ${g.you}`} />
              <span className="online-opp">{t("home.vs", { name: g.opponent })}{g.opponentRating && <span className="muted"> {g.opponentRating}</span>}</span>
              <span className="grow" />
              <span className="muted online-meta">{[g.speed, site(g.platform), g.date ? new Date(g.date).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""].filter(Boolean).join(" · ")}</span>
            </button>
          ))}
        </div>
      )}

      {history.length > 0 && !online?.games.length && (
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
          <span className={`field-note ${foundText && names.some((n) => !online?.found[n]?.length) ? "bad" : ""}`}>
            {online?.loading ? t("home.onlineLoading") : foundText ?? t("home.usernamesUse")}
          </span>
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
        <label className="switch-row">
          <span className="picker-label">{t("home.sound")}</span>
          <input type="checkbox" checked={settings.sound} onChange={(e) => onChangeSettings({ ...settings, sound: e.target.checked })} />
          <span className="switch" aria-hidden />
        </label>
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
        {REACTING_SETS.includes(settings.pieceSet) && (
        <label className="switch-row">
          <span className="picker-label">{t("home.reactions")}</span>
          <input type="checkbox" checked={settings.reactions} onChange={(e) => onChangeSettings({ ...settings, reactions: e.target.checked })} />
          <span className="switch" aria-hidden />
        </label>
        )}
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
        <p className="version">{t("home.version", { v: globalThis.chrome?.runtime?.getManifest?.().version ?? "dev" })}</p>
      </div>
    </div>
  );
}
