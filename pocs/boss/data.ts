// Boss seed data (KMS party bosses). Sources and what is verified vs estimated: ./SOURCES.md
// Type-only imports so `node --test` can load this file without the `@/` alias.
import type { Boss } from "@/lib/types";

// shortcut: every cut below is an ESTIMATE (≈ 10,000 × (HP / 노말 스우 HP)^0.3, rounded).
// Replace with maplescouter calculatedData.bossCuts once the live crawl captures them.
export const CUTS: Record<string, number> = {
  "normal-lotus": 10_000,
  "hard-lotus": 25_000,
  "extreme-lotus": 83_000,
  "normal-damien": 9_000,
  "hard-damien": 26_000,
  "normal-guardian-angel-slime": 14_000,
  "chaos-guardian-angel-slime": 34_000,
  "easy-lucid": 18_000,
  "normal-lucid": 23_000,
  "hard-lucid": 37_000,
  "easy-will": 20_000,
  "normal-will": 23_000,
  "hard-will": 37_000,
  "normal-dusk": 23_000,
  "chaos-dusk": 37_000,
  "normal-jin-hilla": 34_000,
  "hard-jin-hilla": 41_000,
  "normal-darknell": 23_000,
  "hard-darknell": 40_000,
  "hard-black-mage": 45_000,
  "extreme-black-mage": 110_000,
  "normal-seren": 43_000,
  "hard-seren": 56_000,
  "extreme-seren": 115_000,
  "easy-kalos": 51_000,
  "normal-kalos": 70_000,
  "chaos-kalos": 110_000,
  "extreme-kalos": 175_000,
  "easy-first-adversary": 58_000,
  "normal-first-adversary": 80_000,
  "hard-first-adversary": 140_000,
  "extreme-first-adversary": 200_000,
  "easy-kaling": 53_000,
  "normal-kaling": 82_000,
  "hard-kaling": 115_000,
  "extreme-kaling": 180_000,
  "normal-malefic-star": 99_000,
  "hard-malefic-star": 155_000,
  "normal-limbo": 120_000,
  "hard-limbo": 145_000,
  "extreme-limbo": 245_000,
  "normal-baldrix": 130_000,
  "hard-baldrix": 165_000,
  "extreme-baldrix": 255_000,
};

type Force = [NonNullable<Boss["forceType"]>, number] | null;
const ARC = (n: number): Force => ["arcane", n];
const AUT = (n: number): Force => ["authentic", n];

// hp is given per phase in 억 (1e8) so the sums stay exact integers.
function row(slug: string, name: string, difficulty: Boss["difficulty"], level: number, hpEok: number[],
  defenseRate: number, force: Force, maxParty: number): Boss {
  const id = `${difficulty}-${slug}`;
  return {
    id, name, difficulty, level, defenseRate, maxParty,
    hp: hpEok.reduce((a, b) => a + b, 0) * 1e8,
    forceType: force?.[0] ?? null,
    forceRequired: force?.[1] ?? null,
    imageUrl: `/bosses/${slug}.png`,
    statBasis: defenseRate >= 380 ? "380" : "300",
    cut: CUTS[id],
  };
}

//   slug, name, difficulty, level, phase HP (억), 방어율, force, max party
export const BOSSES: Boss[] = [
  row("lotus", "스우", "normal", 210, [3214, 3214, 4309], 300, null, 6),
  row("lotus", "스우", "hard", 210, [68400, 68400, 91200], 300, null, 6),
  row("lotus", "스우", "extreme", 285, [3695000, 3695000, 4882000], 380, null, 2),
  row("damien", "데미안", "normal", 210, [5754, 2466], 300, null, 6),
  row("damien", "데미안", "hard", 210, [172620, 73980], 300, null, 6),
  row("guardian-angel-slime", "가디언 엔젤 슬라임", "normal", 220, [34300], 300, null, 6),
  row("guardian-angel-slime", "가디언 엔젤 슬라임", "chaos", 250, [617400], 300, null, 6),
  row("lucid", "루시드", "easy", 230, [41100, 41100], 300, ARC(360), 6),
  row("lucid", "루시드", "normal", 230, [82200, 82200], 300, ARC(360), 6),
  row("lucid", "루시드", "hard", 230, [363220, 386100, 128000], 300, ARC(360), 6),
  row("will", "윌", "easy", 235, [37576, 28182, 46970], 300, ARC(560), 6),
  row("will", "윌", "normal", 250, [56364, 42273, 70455], 300, ARC(760), 6),
  row("will", "윌", "hard", 250, [281820, 211365, 352275], 300, ARC(760), 6),
  row("dusk", "더스크", "normal", 255, [171970], 300, ARC(730), 6),
  row("dusk", "더스크", "chaos", 255, [860000], 300, ARC(730), 6),
  row("jin-hilla", "진 힐라", "normal", 250, [612255], 300, ARC(820), 6),
  row("jin-hilla", "진 힐라", "hard", 250, [1224510], 300, ARC(900), 6),
  row("darknell", "듄켈", "normal", 265, [178000], 300, ARC(850), 6),
  row("darknell", "듄켈", "hard", 265, [1082000], 300, ARC(850), 6),
  row("black-mage", "검은 마법사", "hard", 275, [221130, 405405, 552825, 479115], 300, ARC(1320), 6),
  row("black-mage", "검은 마법사", "extreme", 280, [7988600, 8063070, 8699450, 7819350], 300, ARC(1320), 6),
  row("seren", "선택받은 세렌", "normal", 270, [356000, 1056000], 380, AUT(200), 6),
  row("seren", "선택받은 세렌", "hard", 275, [856000, 2424000], 380, AUT(200), 6),
  row("seren", "선택받은 세렌", "extreme", 280, [8963000, 30536000], 380, AUT(200), 6),
  row("kalos", "감시자 칼로스", "easy", 270, [631000, 1752000], 380, AUT(200), 6),
  row("kalos", "감시자 칼로스", "normal", 280, [2244000, 4804000], 380, AUT(300), 6),
  row("kalos", "감시자 칼로스", "chaos", 285, [7080000, 27120000], 380, AUT(330), 6),
  row("kalos", "감시자 칼로스", "extreme", 285, [39879000, 104208000], 380, AUT(440), 6),
  row("first-adversary", "최초의 대적자", "easy", 270, [1160000, 1160000, 1545000], 380, AUT(220), 3),
  row("first-adversary", "최초의 대적자", "normal", 280, [3350000, 3350000, 4452000], 380, AUT(320), 3),
  row("first-adversary", "최초의 대적자", "hard", 285, [21560000, 21560000, 28659000], 380, AUT(340), 3),
  row("first-adversary", "최초의 대적자", "extreme", 290, [68340000, 68340000, 90852000], 380, AUT(460), 3),
  row("kaling", "카링", "easy", 275, [654950, 711900, 632200, 737500], 380, AUT(230), 6),
  row("kaling", "카링", "normal", 285, [2705000, 3173000, 2707000, 3132000], 380, AUT(330), 6),
  row("kaling", "카링", "hard", 285, [6217000, 9573000, 9573000, 11790000], 380, AUT(350), 6),
  row("kaling", "카링", "extreme", 285, [40802000, 46985000, 35239000, 44046000], 380, AUT(480), 6),
  row("malefic-star", "찬란한 흉성", "normal", 280, [22358400], 380, AUT(400), 3),
  row("malefic-star", "찬란한 흉성", "hard", 280, [100232000], 380, AUT(550), 3),
  row("limbo", "림보", "normal", 285, [13015000, 6552000, 6552000, 17474000], 380, AUT(500), 3),
  row("limbo", "림보", "hard", 285, [25474000, 12737000, 12737000, 32967000], 380, AUT(500), 3),
  row("limbo", "림보", "extreme", 285, [138000000, 69000000, 69000000, 178000000], 380, AUT(810), 3),
  row("baldrix", "발드릭스", "normal", 290, [16129000, 17160000, 22929000], 380, AUT(700), 3),
  row("baldrix", "발드릭스", "hard", 290, [36205000, 38564000, 51528000], 380, AUT(700), 3),
  row("baldrix", "발드릭스", "extreme", 290, [154000000, 165000000, 220000000], 380, AUT(830), 3),
];
