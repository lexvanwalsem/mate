import { detectLang } from "./i18n";
export interface Settings {
  lang: "nl" | "en";
  depth: number;
  usernames: string; // comma separated
  pieceSet: string;
  mascot: string;
}

export interface MascotTheme { id: string; unlockLevel: number; swatch: string; vars: Record<string, string> }

/** Blokje colors. Higher ones unlock as you level up in lessons and puzzles. */
export const MASCOT_THEMES: MascotTheme[] = [
  { id: "violet", unlockLevel: 1, swatch: "#6c4cf5", vars: { top: "#8d6bff", bottom: "#5b3df0", light: "#7a5bff", mid: "#6a49f5", dark: "#4a2fd0" } },
  { id: "coral", unlockLevel: 2, swatch: "#f25a5f", vars: { top: "#ff8f8f", bottom: "#e8454f", light: "#ff7a7a", mid: "#f25a5f", dark: "#b92f3a" } },
  { id: "mint", unlockLevel: 3, swatch: "#22c58b", vars: { top: "#52e0b0", bottom: "#14a37a", light: "#3fd6a3", mid: "#22c58b", dark: "#0e7d5c" } },
  { id: "sun", unlockLevel: 4, swatch: "#f7b928", vars: { top: "#ffd95e", bottom: "#f0a500", light: "#ffcf3f", mid: "#f7b928", dark: "#b87d00" } },
];

export function applyMascotTheme(id: string) {
  const theme = MASCOT_THEMES.find((t) => t.id === id) ?? MASCOT_THEMES[0];
  for (const [k, v] of Object.entries(theme.vars)) document.documentElement.style.setProperty(`--m-${k}`, v);
}

const KEY = "zetje-settings";
const DEFAULTS: Settings = { lang: detectLang(), depth: 14, usernames: "", pieceSet: "cburnett", mascot: "violet" };

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage may be unavailable, settings just will not persist
  }
}
