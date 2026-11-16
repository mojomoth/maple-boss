import type { Boss } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/boss/search";

// <optgroup> per boss name, difficulties in DIFFICULTY_LABEL order.
export function groupBosses(bosses: Boss[]): [string, Boss[]][] {
  const order = Object.keys(DIFFICULTY_LABEL);
  const groups = new Map<string, Boss[]>();
  for (const b of bosses) groups.set(b.name, [...(groups.get(b.name) ?? []), b]);
  return [...groups].map(([name, bs]) => [name, bs.sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty))]);
}
