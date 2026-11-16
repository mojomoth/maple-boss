import Link from "next/link";

const pocs = [
  { href: "/character", title: "1. 캐릭터 등록", desc: "닉네임으로 캐릭터 모습과 환산 주스탯 불러오기" },
  { href: "/boss", title: "2. 보스 조회", desc: "보스 이름으로 그림과 스탯 보기" },
  { href: "/party", title: "3. 파티 구직·편성", desc: "보스별 구직 목록, 배율 합산 110% 판정" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Maple Boss PoC</h1>
      <ul className="mt-6 space-y-3">
        {pocs.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="block rounded-xl border border-neutral-700 p-4 hover:bg-neutral-900">
              <div className="font-semibold">{p.title}</div>
              <div className="text-sm text-neutral-400">{p.desc}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
