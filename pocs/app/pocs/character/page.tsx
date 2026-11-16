"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Character, ClearRate } from "@/lib/types";
import { pct } from "@/character/format";
import { formatKorean } from "@/boss/search";
import { CRAWLING, errorText } from "../../messages";
import { PinIcon, Sprite } from "../../ui";

const num = (n: number) => n.toLocaleString("ko-KR");

export default function CharacterPage() {
  const field = useRef<HTMLInputElement>(null); // uncontrolled: hydration keeps what was typed before it
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importUrl, setImportUrl] = useState(""); // 501: no crawler on this server
  const [result, setResult] = useState<Character | null>(null);
  const [list, setList] = useState<Character[]>([]);
  const [rates, setRates] = useState<(ClearRate & { label: string })[]>([]);

  const refresh = () =>
    fetch("/api/character")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setList(d))
      .catch(() => {});
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (!result) return;
    let live = true;
    fetch(`/api/character/rates?name=${encodeURIComponent(result.name)}`)
      .then((r) => r.json())
      .then((r) => live && setRates(Array.isArray(r) ? r : []))
      .catch(() => live && setRates([]));
    return () => {
      live = false;
    };
  }, [result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = field.current?.value.trim() ?? "";
    if (!name || loading) return;
    setLoading(true);
    setError("");
    setImportUrl("");
    try {
      const res = await fetch("/api/character", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 501 && data?.importUrl) setImportUrl(data.importUrl);
      if (!res.ok) throw new Error(data?.error ?? `캐릭터를 등록하지 못했어요 (${res.status}). 잠시 뒤 다시 시도해 주세요.`);
      setResult(data);
      refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell main">
      <section aria-labelledby="character-title">
        <div className="section-head">
          <h1 id="character-title">캐릭터 등록</h1>
        </div>
        <form onSubmit={submit} className="form-row">
          <input
            ref={field}
            id="character-name"
            name="name"
            placeholder="캐릭터 닉네임"
            aria-label="캐릭터 닉네임"
            className="field field--wide"
          />
          <button disabled={loading} aria-busy={loading} className="btn btn--primary">
            {loading ? "불러오는 중…" : "등록"}
          </button>
          {loading && (
            <p className="msg" role="status">
              {CRAWLING}
            </p>
          )}
          {error && (
            <p className="msg is-error" role="alert">
              {error}
            </p>
          )}
          {importUrl && (
            <p className="msg">
              가져오는 방법은 <Link href="/">메인 화면</Link>에서 닉네임을 넣고 ‘추가’를 누르면 나와요.{" "}
              <a href={importUrl} target="_blank" rel="noopener noreferrer">
                maplescouter에서 결과 열기<span className="visually-hidden"> (새 탭)</span>
              </a>
            </p>
          )}
        </form>
      </section>

      {result && (
        <section className="panel" aria-labelledby="result-title">
          <div className="panel-head">
            <Sprite c={result} size="member" />
            <div className="pick-text">
              <h2 id="result-title">{result.name}</h2>
              <span className="meta">
                <span className="num">Lv.{result.level}</span>
                <span>{result.job}</span>
              </span>
            </div>
          </div>
          <dl className="facts">
            <div>
              <dt>월드</dt>
              <dd>{result.world}</dd>
            </div>
            <div>
              <dt>전투력</dt>
              <dd className="num">{formatKorean(result.combatPower)}</dd>
            </div>
            <div>
              <dt>보스300 환산</dt>
              <dd className="num">{num(result.boss300Stat)}</dd>
            </div>
            <div>
              <dt>보스380 환산</dt>
              <dd className="num">{num(result.boss380Stat)}</dd>
            </div>
          </dl>
          <div>
            <div className="section-head">
              <h2>보스 배율</h2>
              <span className="count num">{rates.length}</span>
              <p className="section-help section-help--end">어려운 보스부터</p>
            </div>
            {rates.length === 0 ? (
              <p className="section-help">배율 데이터가 없어요.</p>
            ) : (
              <ul className="rates">
                {rates.map((r) => (
                  <li key={r.bossId}>
                    <span>{r.label}</span>
                    <strong className="num">
                      {pct(r.clearRate)} <span className="rate-basis">{r.analytics}</span>
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="list-title">
        <div className="section-head">
          <h2 id="list-title">등록한 캐릭터</h2>
          <span className="count num">{list.length}</span>
        </div>
        <ul className="picks">
          {list.map((c) => (
            <li key={c.name}>
              <button type="button" onClick={() => setResult(c)} className="pick-row" aria-current={result?.name === c.name ? "true" : undefined}>
                <Sprite c={c} size="row" />
                <span className="pick-text">
                  <span className="pick-name">
                    <strong>{c.name}</strong>
                    <span className="chip">
                      <PinIcon />
                      {c.world}
                    </span>
                  </span>
                  <span className="meta">
                    <span className="num">Lv.{c.level}</span>
                    <span>{c.job}</span>
                  </span>
                </span>
                <span className="pick-stat">
                  보스300 환산 <strong className="num">{num(c.boss300Stat)}</strong>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
