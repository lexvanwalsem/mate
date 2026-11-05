import { useEffect, useRef, useState } from "react";
import Home from "./screens/Home";
import Loading from "./screens/Loading";
import Summary from "./screens/Summary";
import Review from "./screens/Review";
import { EnginePool } from "./engine/pool";
import { GameAnalysis, analyzeGame } from "./lib/analyze";
import { LoadedGame, loadGame } from "./lib/sources";
import { Side, pickSide } from "./lib/stats";
import { Settings, loadSettings, saveSettings } from "./lib/settings";

type Screen = { name: "home" } | { name: "loading"; text: string; progress?: number } | { name: "summary" } | { name: "review"; start: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [analysis, setAnalysis] = useState<GameAnalysis>();
  const [side, setSide] = useState<Side>("white");
  const [sideKnown, setSideKnown] = useState(false);
  const [error, setError] = useState<string>();
  const pool = useRef<Promise<EnginePool> | undefined>(undefined);

  const updateSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  const run = async (input: string, sideHint?: Side) => {
    setError(undefined);
    try {
      setScreen({ name: "loading", text: "Partij ophalen" });
      const game: LoadedGame = await loadGame(input, sideHint);

      setScreen({ name: "loading", text: "Blokje start de motor", progress: 0 });
      pool.current ??= EnginePool.create(EnginePool.recommendedSize(), 3);
      const engine = await pool.current;

      const result = await analyzeGame(
        game.pgn,
        {
          depth: settings.depth,
          multiPv: 3,
          onProgress: (done, total) => setScreen({ name: "loading", text: "Blokje denkt na", progress: done / total }),
        },
        engine
      );

      const picked = pickSide(result.headers, game.side, settings.usernames.split(","));
      setSide(picked.side);
      setSideKnown(picked.known);
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

  if (screen.name === "loading") return <Loading text={screen.text} progress={screen.progress} />;
  if (screen.name === "summary" && analysis)
    return (
      <Summary
        a={analysis}
        side={side}
        sideKnown={sideKnown}
        onSideChange={(s) => { setSide(s); setSideKnown(true); }}
        onReview={(p) => setScreen({ name: "review", start: p ?? 0 })}
        onBack={() => setScreen({ name: "home" })}
      />
    );
  if (screen.name === "review" && analysis)
    return <Review a={analysis} side={side} pieceSet={settings.pieceSet} start={screen.start} onBack={() => setScreen({ name: "summary" })} />;
  return <Home settings={settings} onChangeSettings={updateSettings} onAnalyze={(i) => run(i)} error={error} />;
}
