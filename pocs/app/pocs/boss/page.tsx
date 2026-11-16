import Image from "next/image";
import { findBosses, listBosses } from "@/boss";
import { DIFFICULTY_LABEL, formatKorean } from "@/boss/search";
import type { Boss } from "@/lib/types";

const FORCE_LABEL = { arcane: "아케인", authentic: "어센틱" } as const;
const names = [...new Set(listBosses().map((b) => b.name))];

export default async function BossPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q ?? "";
  const groups = Map.groupBy(findBosses(q), (b) => b.name);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold">보스 조회</h1>
        <form className="mt-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            list="boss-names"
            placeholder="보스 이름 (예: 카링, 노말 카링, 검은 마법사)"
            aria-label="보스 이름"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
          <datalist id="boss-names">
            {names.map((n) => <option key={n} value={n} />)}
          </datalist>
          <button className="rounded-lg bg-neutral-100 px-4 py-2 font-semibold text-neutral-900">검색</button>
        </form>

        {groups.size === 0 && <p className="mt-6 text-neutral-400">&lsquo;{q}&rsquo;에 해당하는 보스가 없습니다.</p>}

        {[...groups].map(([name, bosses]) => (
          <section key={name} className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center gap-4">
              <Image src={bosses[0].imageUrl} alt={name} width={96} height={96} className="h-24 w-24 object-contain" />
              <h2 className="text-xl font-semibold">{name}</h2>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm break-keep">
                <thead className="text-left text-neutral-400">
                  <tr>
                    {["난이도", "Lv", "HP", "방어율", "포스", "최대 인원", "기준"].map((h) => (
                      <th key={h} className="px-2 py-1 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bosses.map((b) => <BossRow key={b.id} b={b} />)}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function BossRow({ b }: { b: Boss }) {
  return (
    <tr className="border-t border-neutral-800">
      <td className="px-2 py-1">
        <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">{DIFFICULTY_LABEL[b.difficulty]}</span>
      </td>
      <td className="px-2 py-1">{b.level}</td>
      <td className="px-2 py-1">{formatKorean(b.hp)}</td>
      <td className="px-2 py-1">{b.defenseRate}%</td>
      <td className="px-2 py-1">{b.forceType ? `${FORCE_LABEL[b.forceType]} ${b.forceRequired}` : "-"}</td>
      <td className="px-2 py-1">{b.maxParty}인</td>
      <td className="px-2 py-1">방어율 {b.statBasis}</td>
    </tr>
  );
}
