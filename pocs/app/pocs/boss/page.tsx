import type { Metadata } from "next";
import Image from "next/image";
import { findBosses, listBosses } from "@/boss";
import { DIFFICULTY_LABEL, FORCE_LABEL, formatKorean } from "@/boss/search";
import type { Boss } from "@/lib/types";

const names = [...new Set(listBosses().map((b) => b.name))];

export const metadata: Metadata = { title: "보스 조회", description: "보스의 난이도별 레벨, HP, 방어율, 포스, 최대 인원을 봐요." };

export default async function BossPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw) ?? ""; // ?q=a&q=b arrives as an array: the first one counts
  const groups = Map.groupBy(findBosses(q), (b) => b.name);

  return (
    <main className="shell main">
      <section aria-labelledby="boss-title">
        <div className="section-head">
          <h1 id="boss-title">보스 조회</h1>
        </div>
        <form className="form-row" role="search">
          <input
            name="q"
            defaultValue={q}
            list="boss-names"
            placeholder="보스 이름 (예: 카링, 하스우)"
            aria-label="보스 이름"
            className="field field--wide"
          />
          <datalist id="boss-names">
            {names.map((n) => <option key={n} value={n} />)}
          </datalist>
          <button className="btn btn--primary">검색</button>
        </form>
        {groups.size === 0 && <p className="section-help">&lsquo;{q}&rsquo;에 맞는 보스가 없어요. 목록에서 골라 주세요.</p>}
      </section>

      {[...groups].map(([name, bosses]) => (
        <section key={name} className="panel" aria-label={name}>
          <div className="panel-head">
            <Image src={bosses[0].imageUrl} alt="" width={96} height={96} className="boss-thumb" />
            <h2>{name}</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {["난이도", "레벨", "HP", "방어율", "포스", "최대 인원", "기준"].map((h) => (
                    <th key={h} scope="col">{h}</th>
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
  );
}

function BossRow({ b }: { b: Boss }) {
  return (
    <tr>
      <td>
        <span className="badge">{DIFFICULTY_LABEL[b.difficulty]}</span>
      </td>
      <td className="num">{b.level}</td>
      <td className="num">{formatKorean(b.hp)}</td>
      <td className="num">{b.defenseRate}%</td>
      <td>{b.forceType ? `${FORCE_LABEL[b.forceType]} ${b.forceRequired}` : "없음"}</td>
      <td className="num">{b.maxParty}명</td>
      <td>방어율 {b.statBasis}</td>
    </tr>
  );
}
