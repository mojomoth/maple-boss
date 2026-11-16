"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "메인 화면"],
  ["/pocs/character", "캐릭터 등록"],
  ["/pocs/boss", "보스 조회"],
  ["/pocs/party", "파티 편성"],
  ["/flow", "개발 진행"],
] as const;

// Client only for usePathname: the link to the screen you are on carries aria-current.
export default function PocsNav() {
  const path = usePathname();
  return (
    <nav aria-label="다른 화면" className="pocs-nav">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
