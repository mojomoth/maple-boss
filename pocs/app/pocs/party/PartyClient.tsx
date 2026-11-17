"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CLEAR_THRESHOLD, type Boss, type Character } from "@/lib/types";
import type { Seeker } from "@/party";
import { isClearable, shortfall, suggestParty, sumRatios } from "@/party/ratio";
import { groupBosses } from "@/party/labels";
import { bossLabel } from "@/boss/search";
import { pct } from "@/character/format";
import { errorText } from "../../messages";
import { Sprite } from "../../ui";

// Rejects with a message to show: the API's { error }, or what failed with its status for a non-JSON answer.
async function post(url: string, body: unknown, what: string) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `${what} 못했어요 (${res.status}). 잠시 뒤 다시 시도해 주세요.`);
  return data;
}

// A form's result line. An error gets the error colour and role="alert", like everywhere else; success stays a
// polite status (FN-6). The key gives each kind its own element, so a switch is announced as the new kind.
type Note = { text: string; error: boolean };
function Msg({ note }: { note: Note | null }) {
  if (!note) return null;
  return (
    <p key={note.error ? "error" : "ok"} className={note.error ? "msg is-error" : "msg"} role={note.error ? "alert" : "status"}>
      {note.text}
    </p>
  );
}

function BossSelect({ name, bosses, value, onChange, counts }: { name: string; bosses: Boss[]; value: string; onChange: (id: string) => void; counts?: Map<string, number> }) {
  return (
    <select name={name} aria-label="보스" className="field" value={value} onChange={(e) => onChange(e.target.value)}>
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

// One saved party's delete button (DECISIONS D9). A 404 means it is already gone, so the refresh is the answer too.
export function DeleteParty({ id, label }: { id: number; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function remove() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/party/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `파티를 삭제하지 못했어요 (${res.status}). 잠시 뒤 다시 시도해 주세요.`);
      }
      router.refresh(); // the row goes away with it, so the button stays busy
    } catch (err) {
      setMsg(errorText(err));
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn--quiet" disabled={busy} aria-busy={busy} onClick={remove}>
        <span className="visually-hidden">{label} 파티 </span>
        {busy ? "삭제 중…" : "삭제"}
      </button>
      {msg && (
        <p className="msg is-error" role="alert">
          {msg}
        </p>
      )}
    </>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const BAR_MAX = 2; // the sum bar spans 0..200%; bigger sums (노말 스우 1,783,218.8%) just fill it

export function RequestForm({ characters, bosses }: { characters: Character[]; bosses: Boss[] }) {
  const router = useRouter();
  const [name, setName] = useState(characters[0].name);
  const [bossId, setBossId] = useState(bosses[0].id);
  const [size, setSize] = useState(1);
  const [msg, setMsg] = useState<Note | null>(null);
  const boss = bosses.find((b) => b.id === bossId)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post("/api/party/requests", { characterName: name, bossId, partySize: size }, "구직을 등록하지");
      setMsg({ text: `${name} 캐릭터를 ${bossLabel(boss)} 구직에 등록했어요. 희망 인원은 ${size}명이에요.`, error: false });
      router.refresh();
    } catch (err) {
      setMsg({ text: errorText(err), error: true });
    }
  }

  return (
    <form onSubmit={submit} className="form-row">
      <select name="characterName" aria-label="캐릭터" className="field" value={name} onChange={(e) => setName(e.target.value)}>
        {characters.map((c) => (
          <option key={c.name} value={c.name}>{c.name} ({c.job} Lv.{c.level})</option>
        ))}
      </select>
      <BossSelect name="bossId" bosses={bosses} value={bossId} onChange={(id) => { setBossId(id); setSize(1); }} />
      <select name="partySize" aria-label="희망 인원" className="field" value={size} onChange={(e) => setSize(Number(e.target.value))}>
        {range(boss.maxParty).map((n) => <option key={n} value={n}>{n}인</option>)}
      </select>
      <button className="btn btn--primary">구직 등록</button>
      <Msg note={msg} />
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
  const [msg, setMsg] = useState<Note | null>(null);
  // A second click while the first request is out would find the requests closed and replace the success
  // message with an error. The ref stops it at once; the state disables the button.
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);

  const list = seekers.filter((s) => s.bossId === boss.id);
  // Has a rate and accepts a party this big (희망 인원 >= 파티 인원).
  const selectable = (s: Seeker): s is Seeker & { clearRate: number } => s.clearRate !== null && s.partySize >= size;
  const rated = list.filter(selectable);
  const chosen = rated.filter((s) => picked.includes(s.character.name));
  const sum = sumRatios(chosen.map((s) => s.clearRate));
  const ok = isClearable(sum, CLEAR_THRESHOLD);

  function selectBoss(id: string) {
    setBossId(id);
    setSize(bosses.find((b) => b.id === id)!.maxParty);
    setPicked([]);
  }
  function toggle(name: string) {
    setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : p.length < size ? [...p, name] : p));
  }
  async function form() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      const r = await post("/api/party", { bossId: boss.id, members: picked }, "파티를 편성하지");
      setMsg({
        text: r.clearable
          ? `#${r.id} 파티를 편성했어요. 합계 ${pct(r.sum)}로 공략 가능해요.`
          : `#${r.id} 파티를 편성했어요. 합계 ${pct(r.sum)}로, 110%까지 ${pct(shortfall(r.sum, CLEAR_THRESHOLD))} 모자라요.`,
        error: false,
      });
      setPicked([]);
      router.refresh();
    } catch (err) {
      setMsg({ text: errorText(err), error: true });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="panel-body">
      <div className="form-row">
        <BossSelect name="builderBossId" bosses={bosses} value={boss.id} onChange={selectBoss} counts={counts} />
        <select name="builderSize" aria-label="파티 인원" className="field" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPicked([]); }}>
          {range(boss.maxParty).map((n) => <option key={n} value={n}>{n}인 파티</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <p className="section-help">이 보스에 구직 중인 캐릭터가 없어요.</p>
      ) : (
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th><span className="visually-hidden">선택</span></th><th><span className="visually-hidden">모습</span></th><th scope="col">캐릭터</th><th scope="col">직업</th><th scope="col">희망 인원</th><th scope="col" className="end">배율</th></tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const on = picked.includes(s.character.name);
              return (
                <tr key={s.requestId}>
                  <td>
                    <input type="checkbox" name="member" value={s.character.name} aria-label={`${s.character.name} 선택`} checked={on} disabled={!selectable(s) || (!on && picked.length >= size)} onChange={() => toggle(s.character.name)} />
                  </td>
                  <td>
                    <Sprite c={s.character} size="row" />
                  </td>
                  <td>{s.character.name}</td>
                  <td>{s.character.job}</td>
                  <td>{s.partySize}인</td>
                  <td className="end num">
                    {s.clearRate === null ? <span className="rate-basis">배율 없음</span> : <>{pct(s.clearRate)} <span className="rate-basis">{s.analytics}</span></>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      <div>
        <div className={ok ? "sum-bar is-ok" : "sum-bar"} aria-hidden="true">
          <span style={{ width: `${Math.min(sum / BAR_MAX, 1) * 100}%` }} />
          <i style={{ left: `${(CLEAR_THRESHOLD / BAR_MAX) * 100}%` }} title="110%" />
        </div>
        <p className="sum-line">
          <span className="num">
            {chosen.length}/{size}명
          </span>
          <span>
            합계 <strong className="num">{pct(sum)}</strong>
          </span>
          {ok ? <span className="badge">공략 가능</span> : <span className="badge badge--error">공략 불가 ({pct(shortfall(sum, CLEAR_THRESHOLD))} 부족)</span>}
        </p>
      </div>

      <div className="form-row">
        <button type="button" className="btn btn--quiet" disabled={rated.length === 0} onClick={() => setPicked(suggestParty(rated, size, CLEAR_THRESHOLD).map((s) => s.character.name))}>
          추천 편성
        </button>
        <button type="button" className="btn btn--primary" disabled={chosen.length === 0 || busy} aria-busy={busy} onClick={form}>
          {busy ? "편성 중…" : "파티 편성"}
        </button>
      </div>
      <Msg note={msg} />
    </div>
  );
}
