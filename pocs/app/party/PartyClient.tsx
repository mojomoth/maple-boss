"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLEAR_THRESHOLD, type Boss, type Character } from "@/lib/types";
import type { Seeker } from "@/party";
import { isClearable, suggestParty, sumRatios } from "@/party/ratio";
import { bossLabel, groupBosses, pct } from "@/party/labels";

const field = "rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1";
const button = "rounded-md bg-neutral-100 px-3 py-1 font-medium text-neutral-900 disabled:opacity-40";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "요청 실패");
  return data;
}

function BossSelect({ bosses, value, onChange, counts }: { bosses: Boss[]; value: string; onChange: (id: string) => void; counts?: Map<string, number> }) {
  return (
    <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
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
      <select className={field} value={name} onChange={(e) => setName(e.target.value)}>
        {characters.map((c) => (
          <option key={c.name} value={c.name}>{c.name} ({c.job} Lv.{c.level})</option>
        ))}
      </select>
      <BossSelect bosses={bosses} value={bossId} onChange={(id) => { setBossId(id); setSize(1); }} />
      <select className={field} value={size} onChange={(e) => setSize(Number(e.target.value))}>
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
  const chosen = list.filter((s) => picked.includes(s.character.name));
  const sum = sumRatios(chosen.map((s) => s.ratio));
  const ok = isClearable(sum, CLEAR_THRESHOLD);
  const scale = Math.max(2, sum); // bar spans 0..200% (or more if the sum exceeds it)

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
      setMsg(`파티 #${r.id} 편성 완료 · ${pct(r.sum)} · ${r.clearable ? "공략 가능" : "공략 불가"}`);
      setPicked([]);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <BossSelect bosses={bosses} value={boss.id} onChange={selectBoss} counts={counts} />
        <select className={field} value={size} onChange={(e) => { const n = Number(e.target.value); setSize(n); setPicked((p) => p.slice(0, n)); }}>
          {range(boss.maxParty).map((n) => <option key={n} value={n}>{n}인 파티</option>)}
        </select>
        <span className="text-sm text-neutral-400">컷 {boss.cut.toLocaleString()} ({boss.statBasis} 기준)</span>
      </div>

      {list.length === 0 ? (
        <p className="text-neutral-400">이 보스에 구직 중인 캐릭터가 없습니다.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-400">
            <tr><th className="w-8" /><th /><th>캐릭터</th><th>직업</th><th>희망 인원</th><th className="text-right">환산</th><th className="text-right">배율</th></tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const on = picked.includes(s.character.name);
              return (
                <tr key={s.requestId} className="border-t border-neutral-800">
                  <td>
                    <input type="checkbox" aria-label={`${s.character.name} 선택`} checked={on} disabled={!on && picked.length >= size} onChange={() => toggle(s.character.name)} />
                  </td>
                  {/* eslint-disable-next-line @next/next/no-img-element -- external sprite hosts aren't in next.config images */}
                  <td><img src={s.character.imageUrl} alt="" className="h-10 w-10 object-contain" /></td>
                  <td>{s.character.name}</td>
                  <td>{s.character.job}</td>
                  <td>{s.partySize}인</td>
                  <td className="text-right">{s.stat.toLocaleString()}</td>
                  <td className="text-right">{pct(s.ratio)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div>
        <div className="relative h-4 rounded bg-neutral-800">
          <div className={`h-4 rounded ${ok ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${(sum / scale) * 100}%` }} />
          <div className="absolute top-0 h-4 w-0.5 bg-neutral-100" style={{ left: `${(CLEAR_THRESHOLD / scale) * 100}%` }} title="110%" />
        </div>
        <p className="mt-1 text-sm">
          {chosen.length}/{size}명 · 합계 {pct(sum)} ·{" "}
          {ok ? <span className="text-green-400">공략 가능</span> : <span className="text-red-400">공략 불가 ({pct(CLEAR_THRESHOLD - sum)} 부족)</span>}
        </p>
      </div>

      <div className="flex gap-2">
        <button className={button} disabled={list.length === 0} onClick={() => setPicked(suggestParty(list, size, CLEAR_THRESHOLD).map((s) => s.character.name))}>
          추천 편성
        </button>
        <button className={button} disabled={chosen.length === 0} onClick={form}>파티 편성</button>
      </div>
      {msg && <p className="text-sm text-neutral-400">{msg}</p>}
    </div>
  );
}
