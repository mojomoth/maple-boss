// 856463177 -> "8억 5646만"; below 1만 shows the raw number.
export function formatKorean(n: number): string {
  const eok = Math.floor(n / 1e8);
  const man = Math.floor((n % 1e8) / 1e4);
  if (!eok && !man) return n.toLocaleString("ko-KR");
  return [eok && `${eok}억`, man && `${man}만`].filter(Boolean).join(" ");
}
