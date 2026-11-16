// clearRate 17832.188 -> "1,783,218.8%". Cuts below 0.1% instead of rounding, so every rate and sum on screen
// reads the same way and a shown sum always agrees with isClearable (party/ratio.ts): 109.96% shows as 109.9%,
// never as a "110.0%" that does not clear, and shown members never add up past their shown sum. The 1e-6
// (= ratio.ts EPS in 0.1% units) absorbs float noise: 0.57 * 1000 is 569.999…, and must still show 57.0%.
export const pct = (ratio: number) =>
  `${(Math.floor(ratio * 1000 + 1e-6) / 10).toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
