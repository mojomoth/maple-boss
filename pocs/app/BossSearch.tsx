"use client";

import { useEffect, useRef } from "react";
import Form from "next/form";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./ui";

// GET /?boss=<current>&q=<typed>; the page shows findBosses(q)[0], or keeps <current> and flags q as missing.
// `rendered` is new on every server render, so it tells a fresh page from the first render even when the
// rest is the same (searching the boss already on screen).
export default function BossSearch({ labels, value, bossId, missing, rendered }: { labels: string[]; value: string; bossId: string; missing: string; rendered: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const shown = useRef(rendered);
  // A search or Back/Forward is waiting for its page. A refresh after adding a character renders the page too,
  // and must not overwrite what is being typed.
  const moved = useRef(false);
  const sent = useRef(""); // the search on its way, until the field is edited
  useEffect(() => {
    const onPop = () => (moved.current = true);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  // Show the label of the page now on screen, without remounting the field (which would drop its focus). Keyed on
  // props only: on Back/Forward the URL (useSearchParams) changes a render before the page props do, which left
  // the field one step behind and could stamp the old boss onto the restored URL.
  useEffect(() => {
    if (shown.current !== rendered) {
      shown.current = rendered;
      if (moved.current && input.current) input.current.value = value;
      moved.current = false;
    }
    // Swap a matched ?q= for /?boss=<id> so the URL names what is on screen (a shared /?q= link too). It replaces the
    // entry the search pushed. Through the router, not history.replaceState: that left the router on the ?q= page,
    // so the same search again was never rendered.
    if (!missing && new URLSearchParams(location.search).has("q")) router.replace(`/?boss=${bossId}`, { scroll: false });
  }, [rendered, value, bossId, missing, router]);
  return (
    <>
      <Form
        action="/"
        className="search search--boss"
        role="search"
        onSubmit={(e) => {
          const q = input.current?.value.trim() ?? "";
          // Nothing new: the field already names what is on screen, or this search is on its way. Picking a datalist
          // entry submits at once, so an Enter right after it would push a second history entry for the same boss.
          if (q === value || q === sent.current) return e.preventDefault();
          sent.current = q;
          moved.current = true;
        }}
      >
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
            onInput={(e) => {
              sent.current = "";
              if (labels.includes(e.currentTarget.value)) e.currentTarget.form?.requestSubmit();
            }}
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
