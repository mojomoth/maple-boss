"use client";

import { useEffect, useRef } from "react";
import Form from "next/form";
import { SearchIcon } from "./ui";

// GET /?boss=<current>&q=<typed>; the page shows findBosses(q)[0], or keeps <current> and flags q as missing.
export default function BossSearch({ labels, value, bossId, missing }: { labels: string[]; value: string; bossId: string; missing: string }) {
  const input = useRef<HTMLInputElement>(null);
  // Show the resolved label after a search without remounting the field, which would drop its focus,
  // and swap a matched ?q= for the clean /?boss=<id> so the URL names what is on screen.
  useEffect(() => {
    if (input.current) input.current.value = value;
    if (!missing && new URLSearchParams(location.search).has("q")) history.replaceState(null, "", `/?boss=${bossId}`);
  }, [value, bossId, missing]);
  return (
    <>
      <Form action="/" className="search search--boss" role="search">
        <label htmlFor="boss-q">보스 검색</label>
        <input type="hidden" name="boss" value={bossId} />
        <span className="field-wrap">
          <input
            ref={input}
            id="boss-q"
            name="q"
            type="search"
            className="field"
            defaultValue={value}
            list="boss-list"
            autoComplete="off"
            aria-invalid={missing ? true : undefined}
            aria-describedby="boss-msg"
            // Picking a datalist entry is the whole search; submit it at once.
            onInput={(e) => labels.includes(e.currentTarget.value) && e.currentTarget.form?.requestSubmit()}
          />
          <button type="submit" className="icon-btn" aria-label="보스 찾기">
            <SearchIcon />
          </button>
        </span>
        <datalist id="boss-list">
          {labels.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
      </Form>
      <p id="boss-msg" className="search-msg search-msg--boss is-error" role="status">
        {missing && `‘${missing}’에 맞는 보스가 없어요. 목록에서 골라 주세요.`}
      </p>
    </>
  );
}
