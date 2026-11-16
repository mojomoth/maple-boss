// clearRate 17832.188 -> "1,783,218.8%"
export const pct = (ratio: number) =>
  `${(ratio * 100).toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
