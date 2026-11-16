// Pure helpers (type-only imports so `node --test` can load this file).
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

export const bossLabel = (b: Pick<Boss, "name" | "difficulty">) => `${DIFFICULTY_LABEL[b.difficulty]} ${b.name}`;

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// Every whitespace-separated token must appear in "난이도+이름+스카우터 약칭+id", spaces ignored:
// "카링", "노말 카링", "카링 노말", "검은마법사", "가엔슬", "extreme-black" all match.
export function searchBosses(bosses: BossRow[], q: string): BossRow[] {
  const tokens = q.trim().split(/\s+/).filter(Boolean).map(norm);
  return bosses.filter((b) => {
    const hay = norm(`${DIFFICULTY_LABEL[b.difficulty]}${b.name}${b.scouterName}${b.id}`);
    return tokens.every((t) => hay.includes(t));
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
