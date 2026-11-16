// Pure party math. Type-only imports so `node --test` can load this file without the `@/` alias;
// for the same reason callers pass CLEAR_THRESHOLD in instead of importing it here.
import type { Boss, Character } from "@/lib/types";

const EPS = 1e-9; // 0.7 + 0.4 === 1.0999999999999999 in floats; a party at exactly 110% must clear

export function ratioOf(c: Pick<Character, "boss300Stat" | "boss380Stat">, boss: Pick<Boss, "statBasis" | "cut">): number {
  if (!(boss.cut > 0)) return 0; // unknown/zero cut: count nothing rather than Infinity/NaN
  return (boss.statBasis === "380" ? c.boss380Stat : c.boss300Stat) / boss.cut;
}

export const sumRatios = (ratios: number[]) => ratios.reduce((a, b) => a + b, 0);

export const isClearable = (sum: number, threshold: number) => sum >= threshold - EPS;

// Strongest-first greedy. The top-k seekers by ratio have the largest sum of any k-member set, so the
// first k whose top-k reaches the threshold is the smallest clearable party (fewer members = bigger share).
// If no set within `size` reaches it, this returns the top-`size` seekers: the best party possible.
export function suggestParty<T extends { ratio: number }>(seekers: T[], size: number, threshold: number): T[] {
  const picked: T[] = [];
  let sum = 0;
  for (const s of [...seekers].sort((a, b) => b.ratio - a.ratio)) {
    if (picked.length >= size || isClearable(sum, threshold)) break;
    picked.push(s);
    sum += s.ratio;
  }
  return picked;
}
