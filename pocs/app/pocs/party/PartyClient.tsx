"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLEAR_THRESHOLD, type Boss, type Character } from "@/lib/types";
import type { Seeker } from "@/party";
import { isClearable, shownSum, suggestParty, sumRatios } from "@/party/ratio";
import { groupBosses } from "@/party/labels";
import { bossLabel } from "@/boss/search";
import { pct } from "@/character/format";

const field = "max-w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1";
const button = "rounded-md bg-neutral-100 px-3 py-1 font-medium text-neutral-900 disabled:opacity-40";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "요청 실패");
  return data;
}

function BossSelect({ name, bosses, value, onChange, counts }: { name: string; bosses: Boss[]; value: string; onChange: (id: string) => void; counts?: Map<string, number> }) {
  return (
    <select name={name} aria-label="보스" className={field} value={value} onChange={(e) => onChange(e.target.value)}>
      {groupBosses(bosses).map(([name, bs]) => (
        <optgroup key={name} label={name}>
          {bs.map((b) => (
            <option key={b.id} value={b.id}>
              {bossLabel(b)} (최대 {b.maxParty}인){counts ? ` · 구직 ${counts.get(b.id) ?? 0}명` : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const BAR_MAX = 2; // the sum bar spans 0..200%; bigger sums (노말 스우 1,783,218.8%) just fill it

export function RequestForm({ characters, bosses }: { characters: Character[]; bosses: Boss[] }) {
  const router = useRouter();
  const [name, setName] = useState(characters[0].name);
  const [bossId, setBossId] = useState(bosses[0].id);
  const [size, setSize] = useState(1);
  const [msg, setMsg] = useState("");
  const boss = bosses.find((b) => b.id === bossId)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post("/api/party/requests", { characterName: name, bossId, partySize: size });
      setMsg(`${name} → ${bossLabel(boss)} ${size}인 구직 등록 완료`);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <select name="characterName" aria-label="캐릭터" className={field} value={name} onChange={(e) => setName(e.target.value)}>
        {characters.map((c) => (
          <option key={c.name} value={c.name}>{c.name} ({c.job} Lv.{c.level})</option>
        ))}
      </select>
      <BossSelect name="bossId" bosses={bosses} value={bossId} onChange={(id) => { setBossId(id); setSize(1); }} />
      <select name="partySize" aria-label="희망 인원" className={field} value={size} onChange={(e) => setSize(Number(e.target.value))}>
        {range(boss.maxParty).map((n) => <option key={n} value={n}>{n}인</option>)}
      </select>
      <button className={button}>구직 등록</button>
      {msg && <p className="w-full text-sm text-neutral-400">{msg}</p>}
    </form>
  );
}

export function PartyBuilder({ bosses, seekers }: { bosses: Boss[]; seekers: Seeker[] }) {
  const router = useRouter();
  const counts = new Map<string, number>();
  for (const s of seekers) counts.set(s.bossId, (counts.get(s.bossId) ?? 0) + 1);
  const [bossId, setBossId] = useState(seekers[0]?.bossId ?? bosses[0].id);
  const boss = bosses.find((b) => b.id === bossId) ?? bosses[0];
  const [size, setSize] = useState(boss.maxParty);
  const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  const list = seekers.filter((s) => s.bossId === boss.id);
  // Has a rate and accepts a party this big (희망 인원 >= 파티 인원).
  const selectable = (s: Seeker): s is Seeker & { clearRate: number } => s.clearRate !== null && s.partySize >= size;
  const rated = list.filter(selectable);
  const chosen = rated.filter((s) => picked.includes(s.character.name));
  const sum = sumRatios(chosen.map((s) => s.clearRate));
  const ok = isClearable(sum, CLEAR_THRESHOLD);
  const shown = shownSum(sum, CLEAR_THRESHOLD);

  function selectBoss(id: string) {
    setBossId(id);
    setSize(bosses.find((b) => b.id === id)!.maxParty);
    setPicked([]);
  }
  function toggle(name: string) {
    setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : p.length < size ? [...p, name] : p));
  }
  async function form() {
    try {
      const r = await post("/api/party", { bossId: boss.id, members: picked });
      setMsg(`파티 #${r.id} 편성 완료 · ${pct(shownSum(r.sum, CLEAR_THRESHOLD))} · ${r.clearable ? "공략 가능" : "공략 불가"}`);
      setPicked([]);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <BossSelect name="builderBossId" bosses={bosses} value={boss.id} onChange={selectBoss} counts={counts} />
        <select name="builderSize" aria-label="파티 인원" className={field} value={size} onChange={(e) => { setSize(Number(e.target.value)); setPicked([]); }}>
          {range(boss.maxParty).map((n) => <option key={n} value={n}>{n}인 파티</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <p className="text-neutral-400">이 보스에 구직 중인 캐릭터가 없습니다.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-400">
            <tr><th className="w-8" /><th /><th>캐릭터</th><th>직업</th><th>희망 인원</th><th className="text-right">배율</th></tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const on = picked.includes(s.character.name);
              return (
                <tr key={s.requestId} className="border-t border-neutral-800">
                  <td>
                    <input type="checkbox" name="member" value={s.character.name} aria-label={`${s.character.name} 선택`} checked={on} disabled={!selectable(s) || (!on && picked.length >= size)} onChange={() => toggle(s.character.name)} />
                  </td>
                  <td>
                    {s.character.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external sprite hosts aren't in next.config images
                      <img src={s.character.imageUrl} alt="" className="h-10 w-10 object-contain" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-neutral-800" />
                    )}
                  </td>
                  <td>{s.character.name}</td>
                  <td>{s.character.job}</td>
                  <td>{s.partySize}인</td>
                  <td className="text-right tabular-nums">
                    {s.clearRate === null ? <span className="text-neutral-500">배율 없음</span> : `${pct(s.clearRate)} · ${s.analytics}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div>
        <div className="relative h-4 rounded bg-neutral-800">
          <div className={`h-4 rounded ${ok ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.min(sum / BAR_MAX, 1) * 100}%` }} />
          <div className="absolute top-0 h-4 w-0.5 bg-neutral-100" style={{ left: `${(CLEAR_THRESHOLD / BAR_MAX) * 100}%` }} title="110%" />
        </div>
        <p className="mt-1 break-all text-sm">
          {chosen.length}/{size}명 · 합계 {pct(shown)} ·{" "}
          {ok ? <span className="text-green-400">공략 가능</span> : <span className="text-red-400">공략 불가 ({pct(CLEAR_THRESHOLD - shown)} 부족)</span>}
        </p>
      </div>

      <div className="flex gap-2">
        <button className={button} disabled={rated.length === 0} onClick={() => setPicked(suggestParty(rated, size, CLEAR_THRESHOLD).map((s) => s.character.name))}>
          추천 편성
        </button>
        <button className={button} disabled={chosen.length === 0} onClick={form}>파티 편성</button>
      </div>
      {msg && <p className="text-sm text-neutral-400">{msg}</p>}
    </div>
  );
}
