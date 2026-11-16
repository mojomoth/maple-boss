"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// One line at 375px, so the reserved message line holds it without moving the page.
const BUSY = "불러오는 중(최대 3분). 새 창에서 ‘사람인지 확인’을 눌러요.";

// POST /api/character crawls maplescouter; a human may have to pass its check in the browser window it opens.
export default function AddCharacter() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = name.trim();
    if (busy) return;
    if (!n) return setError("캐릭터 닉네임을 입력해 주세요."); // spaces pass `required`
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/character", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `캐릭터를 추가하지 못했어요 (${res.status}).`);
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="search search--add" onSubmit={submit}>
        <label htmlFor="character-name">캐릭터 검색</label>
        <input
          id="character-name"
          name="name"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="캐릭터 닉네임을 입력하세요"
          autoComplete="off"
          maxLength={20}
          required
          readOnly={busy}
          aria-invalid={error ? true : undefined}
          aria-describedby="add-msg"
        />
        <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy}>
          추가
        </button>
      </form>
      <p id="add-msg" className={`search-msg search-msg--add${error ? " is-error" : ""}`} role="status">
        {busy ? BUSY : error}
      </p>
    </>
  );
}
