// Pure party math over maplescouter clearRates; callers pass CLEAR_THRESHOLD in.

const EPS = 1e-9; // 0.7 + 0.4 === 1.0999999999999999 in floats; a party at exactly 110% must clear

export const sumRatios = (ratios: number[]) => ratios.reduce((a, b) => a + b, 0);

export const isClearable = (sum: number, threshold: number) => sum >= threshold - EPS;

// What is missing to reach the threshold, at pct()'s 0.1%: threshold minus the shown (cut) sum, so the two add up
// on screen ("109.9% … 0.1% 부족"). 0 once clearable.
export const shortfall = (sum: number, threshold: number) =>
  isClearable(sum, threshold) ? 0 : Math.ceil((threshold - sum) * 1000 - 1e-6) / 1000;

// Strongest-first greedy. The top-k seekers by clearRate have the largest sum of any k-member set, so the
// first k whose top-k reaches the threshold is the smallest clearable party (fewer members = bigger share).
// If no set within `size` reaches it, this returns the top-`size` seekers: the best party possible.
export function suggestParty<T extends { clearRate: number }>(seekers: T[], size: number, threshold: number): T[] {
  const picked: T[] = [];
  let sum = 0;
  for (const s of [...seekers].sort((a, b) => b.clearRate - a.clearRate)) {
    if (picked.length >= size || isClearable(sum, threshold)) break;
    picked.push(s);
    sum += s.clearRate;
  }
  return picked;
}

// Every clearable party of 1..maxSize from `pool`: fewest members first, then highest sum; members strongest first.
export function rankParties<T extends { clearRate: number }>(pool: T[], maxSize: number, threshold: number, limit = 3): { members: T[]; sum: number }[] {
  // ponytail: searches only the top 16 by clearRate (2^16 = 65k subsets max). Past that, prune branches whose
  // sum + best remaining rates can't reach the threshold, or enumerate by size and stop once `limit` are found.
  const top = [...pool].sort((a, b) => b.clearRate - a.clearRate).slice(0, 16);
  const out: { members: T[]; sum: number }[] = [];
  const walk = (start: number, members: T[], sum: number) => {
    if (members.length && isClearable(sum, threshold)) out.push({ members, sum });
    if (members.length >= maxSize) return;
    for (let i = start; i < top.length; i++) walk(i + 1, [...members, top[i]], sum + top[i].clearRate);
  };
  walk(0, [], 0);
  return out.sort((a, b) => a.members.length - b.members.length || b.sum - a.sum).slice(0, limit);
}
