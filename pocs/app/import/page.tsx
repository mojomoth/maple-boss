"use client";

import "../home.css";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import logo from "@/public/maple-boss-logo.png";

// Where the "Maple Boss로 보내기" bookmarklet lands: /import#<encoded payload>. The fragment never reaches the
// server; this page posts it to /api/character/import and goes back to the main screen.

// For answers without our { error } body (e.g. a host's own 413), in the API's words.
const BY_STATUS: Record<number, string> = {
  400: "maplescouter 캐릭터 데이터가 아니에요. 결과 페이지에서 다시 보내 주세요.",
  413: "데이터가 너무 커요(최대 1MB). maplescouter 캐릭터 데이터만 보내 주세요.",
};

// Resolves with the saved character's name; rejects with a message to show.
async function send(hash: string): Promise<string> {
  if (!hash) throw new Error("가져올 데이터가 없어요. maplescouter 결과 페이지에서 ‘Maple Boss로 보내기’ 북마크를 눌러 주세요.");
  let body: string;
  try {
    body = decodeURIComponent(hash);
    JSON.parse(body);
  } catch {
    throw new Error("받은 데이터가 깨져 있어요. maplescouter 결과 페이지에서 다시 보내 주세요.");
  }
  let res: Response;
  try {
    res = await fetch("/api/character/import", { method: "POST", headers: { "content-type": "application/json" }, body });
  } catch {
    throw new Error("서버에 연결하지 못했어요. 잠시 뒤 북마크를 다시 눌러 주세요.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || typeof data?.name !== "string")
    throw new Error(data?.error ?? BY_STATUS[res.status] ?? `캐릭터를 가져오지 못했어요 (${res.status}). 잠시 뒤 다시 시도해 주세요.`);
  return data.name;
}

export default function ImportPage() {
  const router = useRouter();
  const started = useRef(false);
  const [msg, setMsg] = useState({ text: "캐릭터를 가져오는 중이에요…", error: false });

  useEffect(() => {
    if (started.current) return; // StrictMode runs this twice, and the hash is gone after the first run
    started.current = true;
    const hash = location.hash.slice(1);
    if (hash) history.replaceState(null, "", location.pathname); // keep the payload out of the address bar and history
    send(hash).then(
      (name) => {
        setMsg({ text: `‘${name}’ 캐릭터를 가져왔어요. 메인 화면으로 이동해요.`, error: false });
        router.replace("/");
      },
      (e: Error) => setMsg({ text: e.message, error: true }),
    );
  }, [router]);

  return (
    <div className="home">
      <header className="topbar">
        <div className="shell topbar-row">
          <h1 className="logo">
            <Link href="/" aria-label="Maple Boss 메인 화면">
              <Image src={logo} alt="Maple Boss" width={272} height={91} priority unoptimized />
            </Link>
          </h1>
        </div>
      </header>
      <main className="shell main">
        <section aria-labelledby="import-title">
          <div className="section-head">
            <h2 id="import-title">캐릭터 가져오기</h2>
          </div>
          <div className="empty">
            <p className={msg.error ? "empty-title is-error" : "empty-title"} role="status">
              {msg.text}
            </p>
            {/* each message already says what to do next */}
            {msg.error && (
              <Link className="btn btn--quiet" href="/">
                메인 화면으로
              </Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
