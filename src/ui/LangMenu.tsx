import { useEffect, useRef, useState } from "react";
import { Lang } from "@/lib/i18n";

const LANGS: { id: Lang; name: string }[] = [
  { id: "nl", name: "Nederlands" },
  { id: "en", name: "English" },
];

/** Compact language picker: a globe with the current code that opens a small menu. */
export default function LangMenu({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
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
      <button className="lang-btn" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" />
        </svg>
        <span>{value.toUpperCase()}</span>
        <svg viewBox="0 0 10 6" width="9" height="6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="lang-pop" role="menu">
          {LANGS.map((l) => (
            <button
              key={l.id}
              role="menuitem"
              className={l.id === value ? "on" : ""}
              onClick={() => {
                onChange(l.id);
                setOpen(false);
              }}
            >
              {l.name}
              {l.id === value && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
