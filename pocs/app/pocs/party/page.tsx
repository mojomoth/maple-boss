import Link from "next/link";
import { listCharacters } from "@/character";
import { listBosses } from "@/boss";
import { listParties, listSeekers } from "@/party";
import { shownSum } from "@/party/ratio";
import { bossLabel } from "@/boss/search";
import { pct } from "@/character/format";
import { CLEAR_THRESHOLD } from "@/lib/types";
import { PartyBuilder, RequestForm } from "./PartyClient";

export const dynamic = "force-dynamic";

export default async function PartyPage() {
  const [characters, seekers, parties] = await Promise.all([listCharacters(), listSeekers(), listParties()]);
  const bosses = listBosses();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-2xl font-bold">파티 구직·편성</h1>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-lg font-semibold">구직 등록</h2>
        {characters.length === 0 ? (
          <p className="text-neutral-400">
            먼저 <Link href="/pocs/character" className="underline">/pocs/character</Link> 에서 캐릭터를 등록하세요.
          </p>
        ) : bosses.length === 0 ? (
          <p className="text-neutral-400">
            보스 데이터가 없습니다. <Link href="/pocs/boss" className="underline">/pocs/boss</Link> 를 확인하세요.
          </p>
        ) : (
          <RequestForm characters={characters} bosses={bosses} />
        )}
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-lg font-semibold">보스별 구직 현황</h2>
        {bosses.length === 0 ? (
          <p className="text-neutral-400">보스 데이터가 없습니다.</p>
        ) : (
          <PartyBuilder bosses={bosses} seekers={seekers} />
        )}
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-lg font-semibold">편성된 파티</h2>
        {parties.length === 0 ? (
          <p className="text-neutral-400">아직 편성된 파티가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {parties.map((p) => (
              <li key={p.id} className="rounded-lg border border-neutral-800 p-3">
                <div className="flex flex-wrap items-center gap-x-3">
                  <span className="font-semibold">{p.boss ? bossLabel(p.boss) : p.bossId}</span>
                  <span>합계 {pct(shownSum(p.sum, CLEAR_THRESHOLD))}</span>
                  <span className={p.clearable ? "text-green-400" : "text-red-400"}>{p.clearable ? "공략 가능" : "공략 불가"}</span>
                  <span className="text-xs text-neutral-500">{new Date(p.createdAt).toLocaleString("ko-KR")}</span>
                </div>
                <div className="mt-1 text-sm text-neutral-300">
                  {p.members.map((m) => `${m.name} (${pct(m.ratio)})`).join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
    </div>
  );
}
