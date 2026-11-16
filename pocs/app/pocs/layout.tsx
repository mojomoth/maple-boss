import "../home.css";
import Link from "next/link";

// The PoC screens' way back: one quiet bar above each /pocs/* page, in the main screen's footer style.
export default function PocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="shell foot-row">
          <Link href="/">
            <span aria-hidden="true">← </span>메인 화면으로
          </Link>
          <nav aria-label="다른 화면" className="foot-nav">
            <Link href="/pocs/character">캐릭터 등록</Link>
            <Link href="/pocs/boss">보스 조회</Link>
            <Link href="/pocs/party">파티 편성</Link>
            <Link href="/flow">개발 진행</Link>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
