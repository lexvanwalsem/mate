import { detectLang } from "./i18n";
export interface Settings {
  lang: "nl" | "en";
  depth: number;
  usernames: string; // comma separated
  pieceSet: string;
}

const KEY = "zetje-settings";
const DEFAULTS: Settings = { lang: detectLang(), depth: 14, usernames: "", pieceSet: "cburnett" };

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
