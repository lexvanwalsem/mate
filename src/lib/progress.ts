import { readJson, writeJson } from "./store";

export interface Progress {
  xp: number;
  streak: number;
  lastDay: string; // YYYY-MM-DD of the last activity
  done: string[]; // completed lesson ids
  today: string; // the day todayXp belongs to
  todayXp: number;
}

export const DAILY_GOAL = 50;

const KEY = "zetje-progress";
const day = (d = new Date()) => d.toISOString().slice(0, 10);

export const loadProgress = (): Progress => readJson<Progress>(KEY, { xp: 0, streak: 0, lastDay: "", done: [], today: "", todayXp: 0 });

/** Add XP and update the daily streak. Returns the new progress. */
export function addXp(amount: number, lessonId?: string): Progress {
  const p = loadProgress();
  const today = day();
  if (p.lastDay !== today) {
    const yesterday = day(new Date(Date.now() - 86400000));
    p.streak = p.lastDay === yesterday ? p.streak + 1 : 1;
    p.lastDay = today;
  }
  if (p.today !== today) {
    p.today = today;
    p.todayXp = 0;
  }
  p.xp += amount;
  p.todayXp += amount;
  if (lessonId && !p.done.includes(lessonId)) p.done.push(lessonId);
  writeJson(KEY, p);
  return p;
}

/** Level n needs 100 * n XP in total steps of 100. */
export const levelOf = (xp: number) => Math.floor(xp / 100) + 1;
