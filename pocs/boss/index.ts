// The 60 bosses (data.ts) and lookups over them.
import type { Boss } from "@/lib/types";
import { BOSSES } from "./data.ts";
import { searchBosses } from "./search.ts";

export function listBosses(): Boss[] {
  return BOSSES;
}

export function getBoss(id: string): Boss | null {
  return BOSSES.find((b) => b.id === id) ?? null;
}

export function findBosses(q: string): Boss[] {
  return searchBosses(BOSSES, q);
}

// maplescouter bossCuts (boss, difficulty), e.g. ("카링", "Extreme") -> "extreme-kaling".
export function resolveScouterBoss(name: string, difficulty: string): string | null {
  const d = difficulty.toLowerCase();
  return BOSSES.find((b) => b.scouterName === name && b.difficulty === d)?.id ?? null;
}
