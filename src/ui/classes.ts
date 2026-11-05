import { MoveClassification as MC } from "@/types/enums";

export interface ClassMeta {
  color: string;
  glyph: string; // short symbol drawn in the badge
  mood: Mood;
}

export type Mood = "idle" | "happy" | "wow" | "thinking" | "worried" | "oops" | "shocked" | "proud" | "cheer" | "sleepy";

export const CLASS_META: Record<MC, ClassMeta> = {
  [MC.Splendid]: { color: "#22c7e8", glyph: "!!", mood: "wow" },
  [MC.Perfect]: { color: "#3f7bf2", glyph: "!", mood: "proud" },
  [MC.Best]: { color: "#22c58b", glyph: "*", mood: "happy" },
  [MC.Excellent]: { color: "#6fcf3d", glyph: "+", mood: "happy" },
  [MC.Okay]: { color: "#a3b77a", glyph: "=", mood: "idle" },
  [MC.Opening]: { color: "#c89b5a", glyph: "B", mood: "idle" },
  [MC.Forced]: { color: "#8f93a8", glyph: ">", mood: "idle" },
  [MC.Inaccuracy]: { color: "#f5c120", glyph: "?!", mood: "thinking" },
  [MC.Mistake]: { color: "#f58a1f", glyph: "?", mood: "worried" },
  [MC.Miss]: { color: "#ff7a6b", glyph: "x", mood: "oops" },
  [MC.Blunder]: { color: "#e5384f", glyph: "??", mood: "shocked" },
};

import { t, Key } from "@/lib/i18n";
export const classLabel = (c: MC): string => t(`class.${c}` as Key);
