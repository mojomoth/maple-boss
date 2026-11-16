import type { Boss } from "@/lib/types";

export const DIFFICULTY_LABEL: Record<Boss["difficulty"], string> = {
  easy: "이지",
  normal: "노말",
  hard: "하드",
  chaos: "카오스",
  extreme: "익스트림",
};

export const bossLabel = (b: Pick<Boss, "name" | "difficulty">) => `${DIFFICULTY_LABEL[b.difficulty]} ${b.name}`;

export const pct = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

// <optgroup> per boss name, difficulties in DIFFICULTY_LABEL order.
export function groupBosses(bosses: Boss[]): [string, Boss[]][] {
  const order = Object.keys(DIFFICULTY_LABEL);
  const groups = new Map<string, Boss[]>();
  for (const b of bosses) groups.set(b.name, [...(groups.get(b.name) ?? []), b]);
  return [...groups].map(([name, bs]) => [name, bs.sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty))]);
}
