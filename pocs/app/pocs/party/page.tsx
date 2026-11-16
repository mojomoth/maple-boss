import type { Metadata } from "next";
import Link from "next/link";
import { listCharacters } from "@/character";
import { listBosses } from "@/boss";
import { listParties, listSeekers } from "@/party";
import { bossLabel } from "@/boss/search";
import { pct } from "@/character/format";
import { DeleteParty, PartyBuilder, RequestForm } from "./PartyClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "파티 편성", description: "캐릭터를 보스별 구직에 올리고 배율 합계로 파티를 짜요." };

export default async function PartyPage() {
  const [characters, seekers, parties] = await Promise.all([listCharacters(), listSeekers(), listParties()]);
  const bosses = listBosses();

  return (
    <main className="shell main">
      <div className="section-head">
        <h1>파티 구직·편성</h1>
      </div>

      <section className="panel" aria-labelledby="request-title">
        <h2 id="request-title">구직 등록</h2>
        {characters.length === 0 ? (
          <p className="section-help">
            먼저 <Link href="/pocs/character">캐릭터 등록</Link>에서 캐릭터를 등록해 주세요.
          </p>
        ) : (
          <RequestForm characters={characters} bosses={bosses} />
        )}
      </section>

      <section className="panel" aria-labelledby="builder-title">
        <h2 id="builder-title">보스별 구직 현황</h2>
        <PartyBuilder bosses={bosses} seekers={seekers} />
      </section>

      <section className="panel" aria-labelledby="saved-title">
        <h2 id="saved-title">편성된 파티</h2>
        {parties.length === 0 ? (
          <p className="section-help">아직 편성된 파티가 없어요.</p>
        ) : (
          <ul className="saved">
            {parties.map((p) => {
              const name = p.boss ? bossLabel(p.boss) : p.bossId;
              return (
                <li key={p.id}>
                  <div className="saved-head">
                    <strong>{name}</strong>
                    <span>
                      합계 <strong className="num">{pct(p.sum)}</strong>
                    </span>
                    <span className={p.clearable ? "badge" : "badge badge--error"}>{p.clearable ? "공략 가능" : "공략 불가"}</span>
                    <time dateTime={p.createdAt}>{new Date(p.createdAt).toLocaleString("ko-KR")}</time>
                    <DeleteParty id={p.id} label={`#${p.id} ${name}`} />
                  </div>
                  <ul className="saved-members">
                    {p.members.map((m) => (
                      <li key={m.name}>
                        {m.name}
                        <span className="rate num">{pct(m.ratio)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
