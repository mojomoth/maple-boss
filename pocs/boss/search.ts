// Pure helpers shared by server pages and client components. Type-only imports keep the boss table (data.ts)
// out of client bundles.
import type { Boss } from "@/lib/types";
import type { BossRow } from "./data.ts";

export const DIFFICULTY_LABEL: Record<Boss["difficulty"], string> = {
  easy: "이지",
  normal: "노말",
  hard: "하드",
  chaos: "카오스",
  extreme: "익스트림",
  destiny: "데스티니",
  champion: "챔피언",
};

export const FORCE_LABEL = { arcane: "아케인", authentic: "어센틱" } as const;

export const bossLabel = (b: Pick<Boss, "name" | "difficulty">) => `${DIFFICULTY_LABEL[b.difficulty]} ${b.name}`;

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// Names players use that are not in the boss's name or maplescouter's short name.
const ALIAS: Record<string, string> = { "검은 마법사": "검마" };
// Players write a difficulty as its first syllable in front of the name: 하스우, 익카링, 노칼, 카더스크, 하진힐.
const INITIAL: Record<string, Boss["difficulty"]> = { 이: "easy", 노: "normal", 하: "hard", 카: "chaos", 익: "extreme" };

// Every whitespace-separated token must appear in "난이도+이름+스카우터 약칭+별칭+id", spaces ignored, or be a
// difficulty initial plus part of the name: "카링", "노말 카링", "카링 노말", "검은마법사", "검마", "가엔슬",
// "하스우", "익스트림 검마", "extreme-black" all match.
export function searchBosses(bosses: BossRow[], q: string): BossRow[] {
  const tokens = q.trim().split(/\s+/).filter(Boolean).map(norm);
  return bosses.filter((b) => {
    const names = norm(`${b.name}${b.scouterName}${ALIAS[b.name] ?? ""}`);
    const hay = norm(DIFFICULTY_LABEL[b.difficulty]) + names + b.id;
    return tokens.every((t) => hay.includes(t) || (INITIAL[t[0]] === b.difficulty && t.length > 1 && names.includes(t.slice(1))));
  });
}

// 1073700000000 -> "1조 737억"; keeps the two largest non-zero units (boss HP, 전투력).
export function formatKorean(n: number): string {
  const units: [number, string][] = [[1e16, "경"], [1e12, "조"], [1e8, "억"], [1e4, "만"]];
  const parts = units
    .map(([u, label]) => [Math.floor(n / u) % 10000, label] as const)
    .filter(([v]) => v > 0)
    .slice(0, 2)
    .map(([v, label]) => `${v}${label}`);
  return parts.length ? parts.join(" ") : String(n);
}
