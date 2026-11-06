import { detectLang } from "./i18n";
export interface Settings {
  lang: "nl" | "en";
  depth: number;
  usernames: string; // comma separated
  pieceSet: string;
  mascot: string;
  boardTheme: string;
  sound: boolean;
  dark: boolean;
  /** Blokje pieces pull faces at what happens on the board. */
  reactions: boolean;
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

export const PIECE_SETS = [
  { id: "blokje", name: "Blokje" },
  { id: "cburnett", name: "Classic" },
  { id: "merida", name: "Merida" },
  { id: "staunty", name: "Staunty" },
  { id: "kosal", name: "Kosal" },
  { id: "chessnut", name: "Chessnut" },
  { id: "fantasy", name: "Fantasy" },
  { id: "spatial", name: "Spatial" },
  { id: "rhosgfx", name: "Rhos" },
  { id: "letter", name: "Letter" },
  { id: "pixel", name: "Pixel" },
];

export const BOARD_THEMES = [
  { id: "violet", light: "#f1ecff", dark: "#a58df3" },
  { id: "green", light: "#eeeed2", dark: "#769656" },
  { id: "blue", light: "#dee3e6", dark: "#8ca2ad" },
  { id: "wood", light: "#f0d9b5", dark: "#b58863" },
  { id: "slate", light: "#e4e4ee", dark: "#6b7a99" },
];

export function applyBoardTheme(id: string) {
  const theme = BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
  document.documentElement.style.setProperty("--sq-light", theme.light);
  document.documentElement.style.setProperty("--sq-dark", theme.dark);
}

const KEY = "zetje-settings";
const DEFAULTS: Settings = { lang: detectLang(), depth: 14, usernames: "", pieceSet: "blokje", mascot: "violet", boardTheme: "violet", sound: true, reactions: true, dark: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false };

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
