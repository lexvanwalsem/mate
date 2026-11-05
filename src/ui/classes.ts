import { MoveClassification as MC } from "@/types/enums";

export interface ClassMeta {
  label: string; // UI text (Dutch)
  color: string;
  glyph: string; // short symbol drawn in the badge
  mood: Mood;
}

export type Mood = "idle" | "happy" | "wow" | "thinking" | "worried" | "oops" | "shocked" | "proud";

export const CLASS_META: Record<MC, ClassMeta> = {
  [MC.Splendid]: { label: "Briljant", color: "#22c7e8", glyph: "!!", mood: "wow" },
  [MC.Perfect]: { label: "Geweldig", color: "#3f7bf2", glyph: "!", mood: "proud" },
  [MC.Best]: { label: "Beste", color: "#22c58b", glyph: "*", mood: "happy" },
  [MC.Excellent]: { label: "Uitstekend", color: "#6fcf3d", glyph: "+", mood: "happy" },
  [MC.Okay]: { label: "Goed", color: "#a3b77a", glyph: "=", mood: "idle" },
  [MC.Opening]: { label: "Boekzet", color: "#c89b5a", glyph: "B", mood: "idle" },
  [MC.Forced]: { label: "Geforceerd", color: "#8f93a8", glyph: ">", mood: "idle" },
  [MC.Inaccuracy]: { label: "Onnauwkeurig", color: "#f5c120", glyph: "?!", mood: "thinking" },
  [MC.Mistake]: { label: "Fout", color: "#f58a1f", glyph: "?", mood: "worried" },
  [MC.Miss]: { label: "Gemist", color: "#ff7a6b", glyph: "x", mood: "oops" },
  [MC.Blunder]: { label: "Blunder", color: "#e5384f", glyph: "??", mood: "shocked" },
};
