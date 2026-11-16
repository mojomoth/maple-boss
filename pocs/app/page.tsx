import "./home.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listCharacters, listClearRates } from "@/character";
import { crawlerAvailable } from "@/character/crawl";
import { pct } from "@/character/format";
import { findBosses, getBoss, listBosses } from "@/boss";
import { bossLabel, DIFFICULTY_LABEL, FORCE_LABEL, formatKorean } from "@/boss/search";
import { rankParties, shortfall, suggestParty, sumRatios } from "@/party/ratio";
import { dbInfo } from "@/lib/db";
import { CLEAR_THRESHOLD, type Character } from "@/lib/types";
import logo from "@/public/maple-boss-logo.png";
import AddCharacter from "./AddCharacter";
import BossSearch from "./BossSearch";
import CharacterGrid from "./CharacterGrid";
import { BoltIcon, CrownIcon, HeartIcon, LevelIcon, PeopleIcon, ShieldIcon, Sprite } from "./ui";

export const metadata: Metadata = {
  title: "파티 추천 · Maple Boss", // the layout's "%s · Maple Boss" template skips the page in its own segment
  description: "보스를 고르면 등록한 캐릭터로 잡을 수 있는 파티 조합을 보여줘요.",
};

const DEFAULT_BOSS = "extreme-kaling"; // nobody solos it, so the real data shows 2-member parties
const THRESHOLD = `${Math.round(CLEAR_THRESHOLD * 100)}%`;

type Member = Character & { clearRate: number };

// A solo member's rate is the party total, which the row already shows.
function Members({ members }: { members: Member[] }) {
  return (
    <ul className="members">
      {members.map((m) => (
        <li key={m.name} className="member">
          <Sprite c={m} size="member" />
          <strong>{m.name}</strong>
          <span className="member-meta">
            <span>{m.job}</span>
            {members.length > 1 && <span className="rate num">{pct(m.clearRate)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  // A match renders in place: a redirect() would unmount the page and drop the search field's focus.
  const found = q ? findBosses(q)[0] : undefined;
  const boss = found ?? ((typeof sp.boss === "string" && getBoss(sp.boss)) || getBoss(DEFAULT_BOSS)!);

  const [characters, rates] = await Promise.all([listCharacters(), listClearRates(boss.id)]);
  const byName = new Map(characters.map((c) => [c.name, c]));
  // Characters without a rate for this boss are left out.
  const pool: Member[] = rates.flatMap((r) => {
    const c = byName.get(r.characterName);
    return c ? [{ ...c, clearRate: r.clearRate }] : [];
  });
  const parties = rankParties(pool, boss.maxParty, CLEAR_THRESHOLD);
  const best = parties.length ? [] : suggestParty(pool, boss.maxParty, CLEAR_THRESHOLD);
  const bestSum = sumRatios(best.map((m) => m.clearRate));

  const stats: [React.ReactNode, string, string][] = [
    [<LevelIcon key="i" />, "레벨", String(boss.level)],
    [<HeartIcon key="i" />, "HP", formatKorean(boss.hp)],
    [<ShieldIcon key="i" />, "방어율", `${boss.defenseRate}%`],
    [<BoltIcon key="i" />, "포스", boss.forceType ? `${FORCE_LABEL[boss.forceType]} ${boss.forceRequired}` : "없음"],
    [<PeopleIcon key="i" size={20} />, "최대 인원", `${boss.maxParty}명`],
  ];

  return (
    <div className="home">
      <header className="topbar">
        <div className="shell topbar-row">
          <h1 className="logo">
            <Link href="/" aria-label="Maple Boss 메인 화면">
              <Image src={logo} alt="Maple Boss" width={272} height={91} priority unoptimized />
            </Link>
          </h1>
          <AddCharacter crawler={crawlerAvailable()} />
          <BossSearch
            labels={listBosses().map(bossLabel)}
            value={q && !found ? q : bossLabel(boss)}
            bossId={boss.id}
            missing={q && !found ? q : ""}
            rendered={crypto.randomUUID()}
          />
        </div>
      </header>

      <main className="shell main">
        <section aria-labelledby="chars-title">
          <div className="section-head">
            <h2 id="chars-title" tabIndex={-1}>
              내 캐릭터
            </h2>
            <span className="count num">
              {characters.length}
              <span className="visually-hidden">명</span>
            </span>
            {characters.length > 0 && (
              <p id="cards-help" className="section-help section-help--end">
                카드를 클릭하면 삭제할 수 있어요
              </p>
            )}
          </div>
          {!dbInfo.persistent && (
            // Vercel without DATABASE_URL: PGlite in /tmp, one per instance, so a later request may land on one
            // that never saw the data. Restarts are only part of it.
            <p className="section-help">임시 저장소를 쓰고 있어요. 등록한 캐릭터와 파티가 새로고침 뒤에 안 보이거나 사라질 수 있어요.</p>
          )}
          {characters.length ? (
            <CharacterGrid characters={characters} />
          ) : (
            <div className="empty">
              <p className="empty-title">아직 등록한 캐릭터가 없어요.</p>
              <p>위쪽 캐릭터 검색에 닉네임을 넣고 ‘추가’를 누르면 maplescouter 배율과 함께 카드가 생겨요.</p>
            </div>
          )}
        </section>

        <div className="lower">
          <section aria-labelledby="boss-title">
            <div className="section-head">
              <h2 id="boss-title">보스 정보</h2>
            </div>
            <article className="boss">
              <div className="boss-name">
                <span className="badge badge--solid">{DIFFICULTY_LABEL[boss.difficulty]}</span>
                <h3>{boss.name}</h3>
              </div>
              <div className="boss-stage">
                {/* eslint-disable-next-line @next/next/no-img-element -- 60 wiki images of mixed sizes, contained in a fixed stage */}
                <img src={boss.imageUrl} alt="" width={400} height={250} />
              </div>
              <dl className="stats">
                {stats.map(([icon, k, v]) => (
                  <div key={k}>
                    <dt>
                      {icon}
                      {k}
                    </dt>
                    <dd className="num">{v}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </section>

          <section aria-labelledby="party-title">
            <div className="section-head">
              <h2 id="party-title">추천 파티</h2>
              <span className="count num">{parties.length}</span>
            </div>
            <p className="section-help">등록한 캐릭터로 공략 가능한 조합이에요</p>

            {parties.length > 0 && (
              <ol className="parties">
                {parties.map((p, i) => (
                  <li key={p.members.map((m) => m.name).join("+")} className={i === 0 ? "party party--top" : "party"}>
                    <div className="party-rank">
                      {i === 0 && <CrownIcon />}
                      <strong>{i + 1}순위</strong>
                      {i === 0 && <span className="pick">가장 추천</span>}
                    </div>
                    <Members members={p.members} />
                    <div className="party-sum">
                      <span className="sum">
                        합계 <strong className="num">{pct(p.sum)}</strong>
                      </span>
                      <span className="badge">
                        <PeopleIcon />
                        {p.members.length}인 파티
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {parties.length === 0 && (
              <div className="empty">
                {pool.length === 0 ? (
                  <>
                    <p className="empty-title">
                      {characters.length ? "이 보스의 배율이 있는 캐릭터가 없어요." : "등록한 캐릭터가 없어서 추천할 파티가 없어요."}
                    </p>
                    <p>캐릭터를 추가하면 배율 합계가 {THRESHOLD} 이상인 조합을 여기에 보여줘요.</p>
                  </>
                ) : (
                  <>
                    <p className="empty-title">등록한 캐릭터로는 공략 가능한 조합이 없어요.</p>
                    <p>
                      가장 센 {best.length}인 조합도 합계 <strong className="num">{pct(bestSum)}</strong>로,{" "}
                      {THRESHOLD}까지 <strong className="num">{pct(shortfall(bestSum, CLEAR_THRESHOLD))}</strong>{" "}
                      모자라요.
                    </p>
                    <Members members={best} />
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer>
        <div className="shell foot-row">
          <strong>Maple Boss</strong>
          <span>
            배율: <a href="https://maplescouter.com">maplescouter.com</a>
          </span>
          <nav aria-label="다른 화면" className="foot-nav">
            <Link href="/pocs/character">캐릭터 등록</Link>
            <Link href="/pocs/boss">보스 조회</Link>
            <Link href="/pocs/party">파티 편성</Link>
            <Link href="/flow">개발 진행</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
