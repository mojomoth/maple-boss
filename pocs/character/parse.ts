// maplescouter character data -> our Character, in one place (DECISIONS D2). Used by the import API, the local
// crawler and the seeds. Pure: no server imports, so `node --test` and the client can load it.
import type { Character } from "@/lib/types";

const SITE = "https://maplescouter.com";
const PLACEHOLDER = "으낭다"; // maplescouter's default store before any search
const MAX_CUTS = 100;
const INT_MAX = 2_147_483_647; // Postgres INTEGER
// 1,000,000 = 100,000,000%. Real rates reach ~17,832 (노말 스우); the cap keeps a party's sum finite (no Infinity).
const MAX_CLEAR_RATE = 1e6;

export interface BossCut {
  boss: string;
  difficulty: string;
  clearRate: number;
  analytics: string;
  bossStat: number;
}

// The trimmed form we store (and the bookmarklet sends) instead of the ~250 KB searchResult.
export interface Payload {
  v: 1;
  info: { character_name: string; world_name: string; character_class: string; character_level: number; character_image: string };
  calc: { combatPower: number; boss300_stat: number; boss380_stat: number; bossCuts: BossCut[] };
}

export class ParseError extends Error {}

const fail = (msg: string): never => {
  throw new ParseError(msg);
};

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);

const json = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return fail("JSON 형식이 아니에요. maplescouter에서 복사한 값을 그대로 붙여 넣어 주세요.");
  }
};

// Postgres TEXT/JSONB cannot hold NUL, and a lone surrogate is not valid UTF-8: refuse both up front (400, not 500).
export const storable = (s: string) => !s.includes("\0") && s.isWellFormed();

const str = (o: Obj, key: string, where: string, max: number, min = 1): string => {
  const v = o[key];
  if (typeof v !== "string" || v.trim().length < min || v.trim().length > max) fail(`${where}.${key} 값이 올바르지 않아요.`);
  if (!storable(v as string)) fail(`${where}.${key} 값에 쓸 수 없는 문자가 있어요.`);
  return (v as string).trim();
};

const num = (o: Obj, key: string, where: string, max: number, min = 0): number => {
  const v = o[key];
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) fail(`${where}.${key} 값이 올바르지 않아요.`);
  return v as number;
};

// Accepts the localStorage 'character-store' value (string or object), its `state`, `state.searchResult`, or a Payload.
export function parseCharacter(input: unknown, now = new Date()): { character: Character; payload: Payload } {
  let x = input;
  for (let i = 0; i < 2 && typeof x === "string"; i++) x = json(x); // a JSON string of the JSON string is fine too
  if (isObj(x) && "state" in x) x = x.state;
  if (isObj(x) && "searchResult" in x) x = x.searchResult;
  if (!isObj(x)) return fail("maplescouter 캐릭터 데이터가 아니에요.");

  const v1 = x.v === 1;
  const info = v1 ? x.info : isObj(x.userApiData) ? x.userApiData.info : undefined;
  const calc = v1 ? x.calc : x.calculatedData;
  if (!isObj(info) || !isObj(calc)) return fail("maplescouter 캐릭터 데이터가 아니에요.");

  const cuts = calc.bossCuts;
  if (info.character_name === PLACEHOLDER && !(Array.isArray(cuts) && cuts.length))
    fail("maplescouter 기본 캐릭터(으낭다)예요. maplescouter에서 내 캐릭터를 먼저 검색해 주세요.");
  if (!Array.isArray(cuts)) return fail("calc.bossCuts 값이 올바르지 않아요.");
  if (cuts.length > MAX_CUTS) fail(`보스 배율이 너무 많아요. 최대 ${MAX_CUTS}개까지 받아요.`);

  let image = typeof info.character_image === "string" ? info.character_image.trim() : fail("info.character_image 값이 올바르지 않아요.");
  if (image.startsWith("/")) image = SITE + image;
  if (image.length > 4096 || (image && !/^https?:\/\//.test(image)) || !storable(image)) fail("info.character_image 값이 올바르지 않아요.");

  const payload: Payload = {
    v: 1,
    info: {
      character_name: str(info, "character_name", "info", 20),
      world_name: str(info, "world_name", "info", 50),
      character_class: str(info, "character_class", "info", 50),
      character_level: num(info, "character_level", "info", 300, 1),
      character_image: image,
    },
    calc: {
      combatPower: num(calc, "combatPower", "calc", Number.MAX_SAFE_INTEGER),
      boss300_stat: num(calc, "boss300_stat", "calc", INT_MAX),
      boss380_stat: num(calc, "boss380_stat", "calc", INT_MAX),
      bossCuts: cuts.map((c, i) => {
        const where = `calc.bossCuts[${i}]`;
        if (!isObj(c)) return fail(`${where} 값이 올바르지 않아요.`);
        return {
          boss: str(c, "boss", where, 50),
          difficulty: str(c, "difficulty", where, 20),
          clearRate: num(c, "clearRate", where, MAX_CLEAR_RATE),
          analytics: str(c, "analytics", where, 50, 0),
          bossStat: num(c, "bossStat", where, INT_MAX),
        };
      }),
    },
  };

  const { info: i, calc: c } = payload;
  // URLs resolve '.' and '..' away, so DELETE /api/character/.. could never reach this character.
  if (i.character_name === "." || i.character_name === "..") fail(`‘${i.character_name}’은 캐릭터 이름으로 쓸 수 없어요.`);
  const character: Character = {
    name: i.character_name,
    world: i.world_name,
    job: i.character_class,
    level: Math.trunc(i.character_level),
    imageUrl: i.character_image,
    combatPower: Math.trunc(c.combatPower),
    boss300Stat: Math.trunc(c.boss300_stat),
    boss380Stat: Math.trunc(c.boss380_stat),
    source: "maplescouter",
    fetchedAt: now.toISOString(),
  };
  return { character, payload };
}
