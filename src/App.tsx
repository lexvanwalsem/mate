import { useEffect, useRef, useState } from "react";
import Home from "./screens/Home";
import Loading from "./screens/Loading";
import Summary from "./screens/Summary";
import Review from "./screens/Review";
import { EnginePool } from "./engine/pool";
import { GameAnalysis, analyzeGame } from "./lib/analyze";
import { LoadedGame, loadGame } from "./lib/sources";
import { Side, pickSide } from "./lib/stats";
import { Settings, applyBoardTheme, applyMascotTheme, loadSettings, saveSettings } from "./lib/settings";
import { Key, setLang, t } from "./lib/i18n";
import { setSoundEnabled } from "./lib/sound";
import { addToHistory, loadHistory } from "./lib/history";
import { loadProgress, levelOf, DAILY_GOAL } from "./lib/progress";
import { saveTraining, loadMistakes } from "./lib/mistakes";
import Learn from "./screens/Learn";
import Puzzles from "./screens/Puzzles";
import Train from "./screens/Train";
import Mascot from "./ui/Mascot";
import LangMenu from "./ui/LangMenu";
import StyleMenu from "./ui/StyleMenu";

type Tab = "analyze" | "lessons" | "puzzles" | "train";

type Screen = { name: "home" } | { name: "loading"; text: string; progress?: number } | { name: "summary" } | { name: "review"; start: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [analysis, setAnalysis] = useState<GameAnalysis>();
  const [side, setSide] = useState<Side>("white");
  const [sideKnown, setSideKnown] = useState(false);
  const [error, setError] = useState<string>();
  const [recent, setRecent] = useState(loadHistory);
  const [tab, setTab] = useState<Tab>("analyze");
  const [progress, setProgress] = useState(loadProgress);
  setLang(settings.lang);
  document.title = t("app.name");
  document.documentElement.lang = settings.lang;
  setSoundEnabled(settings.sound);
  document.documentElement.dataset.theme = settings.dark ? "dark" : "light";
  applyMascotTheme(settings.mascot);
  applyBoardTheme(settings.boardTheme);
  const pool = useRef<Promise<EnginePool> | undefined>(undefined);
  const getPool = () => (pool.current ??= EnginePool.create(EnginePool.recommendedSize(), 3));

  const updateSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  const run = async (input: string, sideHint?: Side) => {
    setError(undefined);
    try {
      setScreen({ name: "loading", text: t("loading.fetch") });
      const game: LoadedGame = await loadGame(input, sideHint, settings.usernames.split(","));

      setScreen({ name: "loading", text: t("loading.engine"), progress: 0 });
      const engine = await getPool();

      const result = await analyzeGame(
        game.pgn,
        {
          depth: settings.depth,
          multiPv: 3,
          onProgress: (done, total) => setScreen({ name: "loading", text: t("loading.think"), progress: done / total }),
        },
        engine
      );

      const picked = pickSide(result.headers, game.side, settings.usernames.split(","));
      setSide(picked.side);
      setSideKnown(picked.known);
      addToHistory({ title: `${result.headers.White} - ${result.headers.Black}`, pgn: game.pgn });
      setRecent(loadHistory());
      setAnalysis(result);
      setScreen({ name: "summary" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScreen({ name: "home" });
    }
  };

  // The extension opens this page as index.html#url=<game url>&side=white|black
  useEffect(() => {
    const params = new URLSearchParams(location.hash.slice(1));
    const url = params.get("url") ?? params.get("pgn");
    if (url) {
      const s = params.get("side");
      history.replaceState(null, "", location.pathname);
      run(url, s === "white" || s === "black" ? s : undefined);
    }
  }, []);

  let content;
  if (screen.name === "loading") return <Loading text={screen.text} progress={screen.progress} />;
  if (tab === "lessons") content = <Learn pieceSet={settings.pieceSet} progress={progress} onProgress={setProgress} getPool={getPool} />;
  else if (tab === "puzzles") content = <Puzzles pieceSet={settings.pieceSet} onProgress={setProgress} getPool={getPool} />;
  else if (tab === "train") content = <Train key={progress.xp} pieceSet={settings.pieceSet} onProgress={setProgress} getPool={getPool} />;
  else if (screen.name === "summary" && analysis)
    content = (
      <Summary
        a={analysis}
        side={side}
        sideKnown={sideKnown}
        onSideChange={(s) => { setSide(s); setSideKnown(true); }}
        onReview={(p) => {
          saveTraining(analysis, side);
          setScreen({ name: "review", start: p ?? 0 });
        }}
        onBack={() => setScreen({ name: "home" })}
      />
    );
  else if (screen.name === "review" && analysis)
    content = <Review a={analysis} side={side} pieceSet={settings.pieceSet} start={screen.start} getPool={getPool} onBack={() => setScreen({ name: "summary" })} />;
  else content = <Home settings={settings} history={recent} level={levelOf(progress.xp)} onChangeSettings={updateSettings} onAnalyze={(i) => run(i)} error={error} />;

  const tabs: Tab[] = ["analyze", "lessons", "puzzles", "train"];
  return (
    <div className="app">
      <nav className="nav">
        <span className="brand"><Mascot size={34} /> {t("app.name")}</span>
        {tabs.map((id) => (
          <button key={id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
            {t(`nav.${id}` as Key)}{id === "train" && loadMistakes().length ? ` (${loadMistakes().length})` : ""}
          </button>
        ))}
        <span className="grow" />
        <StyleMenu settings={settings} onChange={updateSettings} />
        <button className="theme-btn" aria-label={t("nav.theme")} title={t("nav.theme")} onClick={() => updateSettings({ ...settings, dark: !settings.dark })}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {settings.dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /></> : <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />}
          </svg>
        </button>
        <LangMenu value={settings.lang} onChange={(lang) => updateSettings({ ...settings, lang })} />
        {progress.streak > 0 && <span className="pill-xp">{t("nav.streak", { n: progress.streak })}</span>}
        <span
          className={`pill-xp goal ${progress.today === new Date().toISOString().slice(0, 10) && progress.todayXp >= DAILY_GOAL ? "done" : ""}`}
          style={{ ["--goal" as string]: `${Math.min(100, progress.today === new Date().toISOString().slice(0, 10) ? (progress.todayXp / DAILY_GOAL) * 100 : 0)}%` }}
          title={t("nav.goal", { n: progress.today === new Date().toISOString().slice(0, 10) ? progress.todayXp : 0, goal: DAILY_GOAL })}
        >
          {t("nav.level", { n: levelOf(progress.xp) })} · {t("nav.xp", { n: progress.xp })}
        </span>
      </nav>
      <main className="main" key={`${tab}-${screen.name}`}>{content}</main>
    </div>
  );
}
