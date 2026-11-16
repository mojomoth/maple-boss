// Shared contract between pocs/character, pocs/boss, pocs/party.
// Change only with the orchestrator's agreement.

export type StatBasis = "300" | "380"; // boss defense rate used for 환산 주스탯

export interface Character {
  name: string;
  world: string;
  job: string;
  level: number;
  imageUrl: string; // character sprite
  combatPower: number; // 전투력
  boss300Stat: number; // 환산 주스탯 vs 방어율 300% boss (calculatedData.boss300_stat)
  boss380Stat: number; // 환산 주스탯 vs 방어율 380% boss (calculatedData.boss380_stat)
  source: "maplescouter";
  fetchedAt: string; // ISO
}

export type Difficulty = "easy" | "normal" | "hard" | "chaos" | "extreme" | "destiny" | "champion";

export interface Boss {
  id: string; // `${difficulty}-${slug}`, e.g. "normal-kaling", "extreme-black-mage"
  name: string; // 카링
  difficulty: Difficulty;
  level: number;
  hp: number; // total HP
  defenseRate: number; // %, e.g. 300
  forceType: "arcane" | "authentic" | null;
  forceRequired: number | null;
  maxParty: number; // 1..6 (maplescouter bossCuts.isPartyLimit)
  imageUrl: string;
  statBasis: StatBasis;
}

// maplescouter calculatedData.bossCuts[i] for one character, resolved to our boss id.
// clearRate is a DAMAGE ratio (1.0 = deals exactly enough to clear solo in the time limit).
// Damage adds up across party members, so a party's clearRates are summed.
export interface ClearRate {
  characterName: string;
  bossId: string;
  clearRate: number;
  analytics: string; // e.g. "솔플 여유컷", "2인 최소컷"
  bossStat: number; // the character's 환산 used for this boss
}

export const CLEAR_THRESHOLD = 1.1; // party sum of clearRate >= 110% => clearable
