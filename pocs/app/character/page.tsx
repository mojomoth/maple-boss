"use client";

import { useEffect, useState } from "react";
import type { Character } from "@/lib/types";
import { formatKorean } from "@/character/format";

const num = (n: number) => n.toLocaleString("ko-KR");

function Sprite({ c, size }: { c: Character; size: number }) {
  if (!c.imageUrl)
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center rounded bg-neutral-800 text-xs text-neutral-500">
        이미지 없음
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element -- remote sprite host, no next/image config needed for a PoC
  return <img src={c.imageUrl} alt={c.name} width={size} height={size} className="object-contain" />;
}

export default function CharacterPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Character | null>(null);
  const [list, setList] = useState<Character[]>([]);

  const refresh = () => fetch("/api/character").then((r) => r.json()).then(setList);
  useEffect(() => {
    refresh();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/character", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `오류 (${res.status})`);
      setResult(data);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">캐릭터 등록</h1>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="캐릭터 닉네임"
          aria-label="캐릭터 닉네임"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
        <button disabled={loading} className="rounded-lg bg-neutral-100 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50">
          {loading ? "불러오는 중…" : "등록"}
        </button>
      </form>

      {loading && (
        <p className="text-sm text-neutral-400" role="status">
          maplescouter에서 불러오는 중이에요. 브라우저 창이 열리면 &apos;사람인지 확인&apos; 체크박스를 눌러주세요. (최대 3분)
        </p>
      )}
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

      {result && (
        <section className="flex gap-4 rounded-xl border border-neutral-700 bg-neutral-900 p-4">
          <Sprite c={result} size={96} />
          <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="col-span-2 text-lg font-bold">{result.name}</dt>
            <dt className="text-neutral-400">레벨 / 직업</dt>
            <dd>Lv.{result.level} {result.job}</dd>
            <dt className="text-neutral-400">월드</dt>
            <dd>{result.world}</dd>
            <dt className="text-neutral-400">전투력</dt>
            <dd>{formatKorean(result.combatPower)}</dd>
            <dt className="text-neutral-400">보스300 환산</dt>
            <dd>{num(result.boss300Stat)}</dd>
            <dt className="text-neutral-400">보스380 환산</dt>
            <dd>{num(result.boss380Stat)}</dd>
            {result.source === "fixture" && <dd className="col-span-2 text-xs text-amber-400">샘플 데이터</dd>}
          </dl>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">등록된 캐릭터 ({list.length})</h2>
        <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-700">
          {list.map((c) => (
            <li key={c.name}>
              <button onClick={() => setResult(c)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-neutral-900">
                <Sprite c={c} size={40} />
                <span className="flex-1">
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-sm text-neutral-400">Lv.{c.level} {c.job} · {c.world}</span>
                  {c.source === "fixture" && <span className="ml-2 text-xs text-amber-400">샘플</span>}
                </span>
                <span className="text-sm text-neutral-300">{num(c.boss300Stat)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
