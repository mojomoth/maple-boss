"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bookmarklet, scouterUrl } from "./import/bookmarklet";
import { CRAWLING, errorText } from "./messages";
import { CloseIcon } from "./ui";

// With the local crawler (crawler: true), POST /api/character crawls maplescouter and a human may have to pass its
// check in the browser window it opens. Without it (Vercel), the nickname opens the import guide instead.
// The nickname field is uncontrolled: hydration keeps what was typed before it, which a controlled field's empty
// state would throw away.
// persistent false (temporary storage): the guide and its result say an import will most likely not show up.
export default function AddCharacter({ crawler, persistent }: { crawler: boolean; persistent: boolean }) {
  const router = useRouter();
  const field = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [guide, setGuide] = useState(""); // the nickname the import guide is open for

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = field.current?.value.trim() ?? "";
    if (busy) return;
    setDone("");
    if (!n) return setError("캐릭터 닉네임을 입력해 주세요."); // spaces pass `required`
    setError("");
    if (!crawler) return setGuide(n);
    setBusy(true);
    try {
      const res = await fetch("/api/character", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 501) return setGuide(n); // the crawler went missing since the page rendered
      if (!res.ok) throw new Error(data?.error ?? `캐릭터를 추가하지 못했어요 (${res.status}). 잠시 뒤 다시 시도해 주세요.`);
      if (field.current) field.current.value = "";
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="search search--add" onSubmit={submit}>
        <label htmlFor="character-name">캐릭터 검색</label>
        <input
          ref={field}
          id="character-name"
          name="name"
          className="field"
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
        {busy ? CRAWLING : error || done}
      </p>
      {guide && (
        <ImportGuide
          name={guide}
          persistent={persistent}
          onClose={() => {
            setGuide("");
            field.current?.focus();
          }}
          // The guide (and the focused 가져오기 button) goes away: back to the field, whose status line says what happened.
          onImported={(n) => {
            setGuide("");
            if (field.current) field.current.value = "";
            setDone(`‘${n}’ 캐릭터를 가져왔어요.${persistent ? "" : " 임시 저장소라 카드는 보통 안 나와요."}`);
            field.current?.focus();
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// Two steps on maplescouter (open the result, press the bookmarklet), plus pasting the store by hand for browsers
// where bookmarklets do not run. Both end in POST /api/character/import.
function ImportGuide({ name, persistent, onClose, onImported }: { name: string; persistent: boolean; onClose: () => void; onImported: (name: string) => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // React refuses javascript: hrefs, so the bookmarklet is set on the DOM node it never manages.
  useEffect(() => link.current?.setAttribute("href", bookmarklet(location.origin)), []);
  useEffect(() => title.current?.focus(), [name]);

  async function paste(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const text = String(new FormData(form).get("store") ?? "");
    if (!text.trim()) return setError("가져올 데이터가 없어요. 복사한 값을 붙여 넣어 주세요.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/character/import", { method: "POST", headers: { "content-type": "application/json" }, body: text });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.name !== "string")
        throw new Error(data?.error ?? `캐릭터를 가져오지 못했어요 (${res.status}). 잠시 뒤 다시 시도해 주세요.`);
      form.reset();
      onImported(data.name);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="guide" aria-labelledby="guide-title">
      <div className="guide-head">
        <h2 id="guide-title" ref={title} tabIndex={-1}>
          maplescouter에서 ‘{name}’ 가져오기
        </h2>
        <button type="button" className="icon-btn" aria-label="가져오기 안내 닫기" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <p className="section-help">
        이 서버는 닉네임으로 바로 불러오지 못해요.{" "}
        {persistent ? "아래 두 단계를 거치면 카드가 생겨요." : "아래 두 단계로 가져올 수는 있지만, 임시 저장소라서 가져온 캐릭터가 보통 화면에 나오지 않아요."}
      </p>
      <ol className="steps">
        <li className="step">
          <span className="step-num" aria-hidden="true">1</span>
          <div className="step-body">
            <a className="btn btn--quiet" href={scouterUrl(name)} target="_blank" rel="noopener noreferrer">
              maplescouter에서 결과 열기<span className="visually-hidden"> (새 탭)</span>
            </a>
            <p>새 탭에서 ‘사람인지 확인’을 누르고 캐릭터 결과가 뜰 때까지 기다려요.</p>
          </div>
        </li>
        <li className="step">
          <span className="step-num" aria-hidden="true">2</span>
          <div className="step-body">
            <a
              ref={link}
              className="btn btn--quiet bookmarklet"
              onClick={(e) => {
                e.preventDefault(); // it only works on the maplescouter page
                setHint(true);
              }}
            >
              Maple Boss로 보내기
            </a>
            <p>이 버튼을 북마크바로 끌어다 놓고, 결과가 뜬 maplescouter 탭에서 그 북마크를 눌러요.</p>
            <p className="guide-msg" role="status">
              {hint && "여기서 누르지 말고 북마크바로 끌어다 놓아 주세요. 북마크바는 Ctrl+Shift+B(맥은 ⌘+Shift+B)로 열어요."}
            </p>
          </div>
        </li>
      </ol>
      <details className="paste">
        <summary>직접 붙여넣기</summary>
        <form className="paste-form" onSubmit={paste}>
          <p id="paste-help">
            북마크를 쓸 수 없으면 maplescouter 결과 탭에서 개발자 도구(F12) 콘솔에 <code>copy(localStorage[&apos;character-store&apos;])</code>를
            입력해요. 복사한 값을 여기에 붙여 넣어요.
          </p>
          <label htmlFor="paste-store">character-store 값</label>
          <textarea
            id="paste-store"
            name="store"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby="paste-help paste-msg"
          />
          <button type="submit" className="btn btn--quiet" disabled={busy} aria-busy={busy}>
            {busy ? "가져오는 중…" : "가져오기"}
          </button>
          <p id="paste-msg" className="guide-msg is-error" role="status">
            {error}
          </p>
        </form>
      </details>
    </section>
  );
}
