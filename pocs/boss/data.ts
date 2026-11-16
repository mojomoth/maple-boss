// Boss seed data: exactly maplescouter's 60 calculatedData.bossCuts (boss × difficulty) entries.
// Sources and what is verified vs estimated: ./SOURCES.md
import type { Boss } from "@/lib/types";

export type BossRow = Boss & { scouterName: string }; // maplescouter bossCuts[].boss

type Force = [NonNullable<Boss["forceType"]>, number] | null;
const ARC = (n: number): Force => ["arcane", n];
const AUT = (n: number): Force => ["authentic", n];

// maplescouter short name -> full KMS name, where they differ.
const FULL_NAME: Record<string, string> = {
  가엔슬: "가디언 엔젤 슬라임",
  세렌: "선택받은 세렌",
  칼로스: "감시자 칼로스",
  대적자: "최초의 대적자",
  흉성: "찬란한 흉성",
};

// hp is given per phase in 억 (1e8) so the sums stay exact integers.
function row(slug: string, scouterName: string, difficulty: Boss["difficulty"], level: number, hpEok: number[],
  defenseRate: number, force: Force, maxParty: number): BossRow {
  return {
    id: `${difficulty}-${slug}`,
    name: FULL_NAME[scouterName] ?? scouterName,
    scouterName, difficulty, level, defenseRate, maxParty,
    hp: hpEok.reduce((a, b) => a + b, 0) * 1e8,
    forceType: force?.[0] ?? null,
    forceRequired: force?.[1] ?? null,
    imageUrl: `/bosses/${slug}.png`,
    statBasis: defenseRate >= 380 ? "380" : "300",
  };
}

//   slug, scouter name, difficulty, level, phase HP (억), 방어율, force, max party (= maplescouter isPartyLimit)
const PARTY_MODES: BossRow[] = [
  row("lotus", "스우", "normal", 210, [3214, 3214, 4309], 300, null, 6),
  row("lotus", "스우", "hard", 210, [68400, 68400, 91200], 300, null, 6),
  row("lotus", "스우", "extreme", 285, [3695000, 3695000, 4882000], 380, null, 2),
  row("damien", "데미안", "normal", 210, [5754, 2466], 300, null, 6),
  row("damien", "데미안", "hard", 210, [172620, 73980], 300, null, 6),
  row("guardian-angel-slime", "가엔슬", "normal", 220, [34300], 300, null, 6),
  row("guardian-angel-slime", "가엔슬", "chaos", 250, [617400], 300, null, 6),
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
  row("seren", "세렌", "normal", 270, [356000, 1056000], 380, AUT(200), 6),
  row("seren", "세렌", "hard", 275, [856000, 2424000], 380, AUT(200), 6),
  row("seren", "세렌", "extreme", 280, [8963000, 30536000], 380, AUT(200), 6),
  row("kalos", "칼로스", "easy", 270, [631000, 1752000], 380, AUT(200), 6),
  row("kalos", "칼로스", "normal", 280, [2244000, 4804000], 380, AUT(300), 6),
  row("kalos", "칼로스", "chaos", 285, [7080000, 27120000], 380, AUT(330), 6),
  row("kalos", "칼로스", "extreme", 285, [39879000, 104208000], 380, AUT(440), 6),
  row("first-adversary", "대적자", "easy", 270, [1160000, 1160000, 1545000], 380, AUT(220), 3),
  row("first-adversary", "대적자", "normal", 280, [3350000, 3350000, 4452000], 380, AUT(320), 3),
  row("first-adversary", "대적자", "hard", 285, [21560000, 21560000, 28659000], 380, AUT(340), 3),
  row("first-adversary", "대적자", "extreme", 290, [68340000, 68340000, 90852000], 380, AUT(460), 3),
  row("kaling", "카링", "easy", 275, [654950, 711900, 632200, 737500], 380, AUT(230), 6),
  row("kaling", "카링", "normal", 285, [2705000, 3173000, 2707000, 3132000], 380, AUT(330), 6),
  row("kaling", "카링", "hard", 285, [6217000, 9573000, 9573000, 11790000], 380, AUT(350), 6),
  row("kaling", "카링", "extreme", 285, [40802000, 46985000, 35239000, 44046000], 380, AUT(480), 6),
  row("malefic-star", "흉성", "normal", 280, [22358400], 380, AUT(400), 3),
  row("malefic-star", "흉성", "hard", 280, [100232000], 380, AUT(550), 3),
  row("limbo", "림보", "normal", 285, [13015000, 6552000, 6552000, 17474000], 380, AUT(500), 3),
  row("limbo", "림보", "hard", 285, [25474000, 12737000, 12737000, 32967000], 380, AUT(500), 3),
  row("limbo", "림보", "extreme", 285, [138000000, 69000000, 69000000, 178000000], 380, AUT(810), 3),
  row("baldrix", "발드릭스", "normal", 290, [16129000, 17160000, 22929000], 380, AUT(700), 3),
  row("baldrix", "발드릭스", "hard", 290, [36205000, 38564000, 51528000], 380, AUT(700), 3),
  row("baldrix", "발드릭스", "extreme", 290, [154000000, 165000000, 220000000], 380, AUT(830), 3),
  row("bellona", "벨로나", "easy", 280, [3160000, 4630000], 380, AUT(400), 3),
  row("bellona", "벨로나", "normal", 280, [16520000, 24700000], 380, AUT(450), 3),
  row("bellona", "벨로나", "hard", 280, [55640000, 81520000], 380, AUT(550), 3),
  row("jupiter", "유피테르", "normal", 295, [69808000], 380, AUT(810), 3), // all forms share one HP bar
  row("jupiter", "유피테르", "hard", 295, [320000000], 380, AUT(810), 3),
];

// Destiny (운명의 무기 미션) and Champion (유니온 챔피언) are solo runs of an existing mode with the same HP.
// Only the player's damage is modified (e.g. Champion −30%), and maplescouter's clearRate already includes that.
const SOLO_MODES: [baseId: string, mode: "destiny" | "champion"][] = [
  ["hard-seren", "destiny"],
  ["chaos-kalos", "destiny"],
  ["hard-first-adversary", "destiny"],
  ["hard-kaling", "destiny"],
  ["hard-limbo", "destiny"],
  ["hard-baldrix", "destiny"],
  ["hard-lotus", "champion"],
  ["hard-jin-hilla", "champion"],
  ["hard-black-mage", "champion"],
  ["hard-seren", "champion"],
  ["normal-kalos", "champion"],
];

export const BOSSES: BossRow[] = [
  ...PARTY_MODES,
  ...SOLO_MODES.map(([baseId, mode]) => {
    const b = PARTY_MODES.find((r) => r.id === baseId)!;
    return { ...b, id: `${mode}-${baseId.slice(b.difficulty.length + 1)}`, difficulty: mode, maxParty: 1 };
  }),
];
