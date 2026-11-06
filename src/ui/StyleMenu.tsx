import { useEffect, useRef, useState } from "react";
import { BOARD_THEMES, PIECE_SETS, Settings } from "@/lib/settings";
import { REACTING_SETS } from "@/lib/reactions";
import { t } from "@/lib/i18n";

/** Header menu to switch the piece set and board colors from any screen. */
export default function StyleMenu({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="lang-menu" ref={ref}>
      <button className="lang-btn style-btn" onClick={() => setOpen(!open)} aria-haspopup="dialog" aria-expanded={open} aria-label={t("nav.style")} title={t("nav.style")}>
        <img alt="" src={`pieces/${settings.pieceSet}/wN.svg`} />
      </button>
      {open && (
        <div className="style-pop" role="dialog" aria-label={t("nav.style")}>
          <span className="picker-label">{t("home.pieces")}</span>
          <div className="piece-grid">
            {PIECE_SETS.map((p) => (
              <button key={p.id} className={`piece-opt ${settings.pieceSet === p.id ? "on" : ""}`} onClick={() => onChange({ ...settings, pieceSet: p.id })}>
                <img alt="" src={`pieces/${p.id}/wN.svg`} />
                {p.name}
              </button>
            ))}
          </div>
          {REACTING_SETS.includes(settings.pieceSet) && (
          <label className="switch-row">
            <span className="picker-label">{t("home.reactions")}</span>
            <input type="checkbox" checked={settings.reactions} onChange={(e) => onChange({ ...settings, reactions: e.target.checked })} />
            <span className="switch" aria-hidden />
          </label>
          )}
          <span className="picker-label">{t("home.board")}</span>
          <div className="board-opts">
            {BOARD_THEMES.map((b) => (
              <button
                key={b.id}
                className={`board-opt ${settings.boardTheme === b.id ? "on" : ""}`}
                style={{ background: `linear-gradient(135deg, ${b.light} 50%, ${b.dark} 50%)` }}
                onClick={() => onChange({ ...settings, boardTheme: b.id })}
                aria-label={b.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
