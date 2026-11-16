"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Character } from "@/lib/types";
import { formatKorean } from "@/boss/search";
import { CloseIcon, PinIcon, Sprite, TrashIcon } from "./ui";

const Meta = ({ c }: { c: Character }) => (
  <span className="meta">
    <span className="num">Lv.{c.level}</span>
    <span>{c.job}</span>
  </span>
);

// The card grid and its delete confirmation (native <dialog>: Esc, focus trap and backdrop for free).
export default function CharacterGrid({ characters }: { characters: Character[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState<Character | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!target || dialog.current?.open) return;
    dialog.current?.showModal();
    cancel.current?.focus();
  }, [target]);

  async function remove() {
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/character/${encodeURIComponent(target.name)}`, { method: "DELETE" });
      // 404: already gone (another tab), which is what the user asked for.
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `삭제하지 못했어요 (${res.status}). 잠시 뒤 다시 시도해 주세요.`);
      }
      dialog.current?.close();
      document.getElementById("chars-title")?.focus(); // the opener card is going away
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ul className="cards">
        {characters.map((c) => (
          <li key={c.name}>
            <button
              type="button"
              className="card"
              aria-haspopup="dialog"
              aria-describedby="cards-help"
              onClick={() => {
                setError(""); // a failed delete that finished after Esc
                setTarget(c);
              }}
            >
              <Sprite c={c} size="card" />
              <span className="card-body">
                <span className="card-name">{c.name}</span>
                <Meta c={c} />
                <span className="chip">
                  <PinIcon />
                  {c.world}
                </span>
                <span className="power">
                  전투력 <strong className="num">{formatKorean(c.combatPower)}</strong>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className="confirm"
        aria-labelledby="confirm-title"
        onClose={() => {
          setTarget(null);
          setError("");
        }}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        {target && (
          <div className="confirm-body">
            <button type="button" className="icon-btn confirm-close" aria-label="닫기" onClick={() => dialog.current?.close()}>
              <CloseIcon />
            </button>
            <span className="confirm-icon" aria-hidden="true">
              <TrashIcon />
            </span>
            <h2 id="confirm-title">캐릭터를 삭제할까요?</h2>
            <div className="preview">
              <Sprite c={target} size="preview" />
              <span className="preview-text">
                <strong>{target.name}</strong>
                <Meta c={target} />
              </span>
            </div>
            <p className="confirm-note">목록에서 삭제하면 추천 파티가 다시 계산돼요.</p>
            {error && (
              <p className="confirm-error" role="alert">
                {error}
              </p>
            )}
            <div className="confirm-actions">
              <button ref={cancel} type="button" className="btn btn--quiet" onClick={() => dialog.current?.close()}>
                취소
              </button>
              {/* aria-disabled, not disabled: a disabled button drops focus out of the dialog */}
              <button type="button" className="btn btn--danger" onClick={remove} aria-disabled={busy} aria-busy={busy}>
                {busy ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
