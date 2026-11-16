// The "Maple Boss로 보내기" bookmarklet (DECISIONS D2). It runs on the user's maplescouter result page, after they
// passed the human check, and carries the character over in the URL fragment, which never reaches a server log.

export const scouterUrl = (name: string) => `https://maplescouter.com/ko/result?name=${encodeURIComponent(name)}`;

type Cut = Record<string, unknown>;
type Store = { state?: { searchResult?: { userApiData?: { info?: Record<string, unknown> }; calculatedData?: { bossCuts?: Cut[] } & Cut } } };

// maplescouter's localStorage 'character-store' -> `${origin}/import#<encoded v1 payload>` (the shape parse.ts
// accepts as `Payload`, ~11 KB instead of ~250 KB). The bookmarklet carries this function as source text, so it
// may use only its arguments and JS built-ins: no imports, no module constants.
export function toImportUrl(store: string | null, origin: string): string {
  const sr = (JSON.parse(store || "null") as Store | null)?.state?.searchResult;
  const info = sr?.userApiData?.info;
  const calc = sr?.calculatedData;
  if (!info || !calc || !Array.isArray(calc.bossCuts)) throw new Error("no maplescouter result on this page");
  const payload = {
    v: 1,
    info: {
      character_name: info.character_name,
      world_name: info.world_name,
      character_class: info.character_class,
      character_level: info.character_level,
      character_image: info.character_image,
    },
    calc: {
      combatPower: calc.combatPower,
      boss300_stat: calc.boss300_stat,
      boss380_stat: calc.boss380_stat,
      bossCuts: calc.bossCuts.map((c) => ({ boss: c.boss, difficulty: c.difficulty, clearRate: c.clearRate, analytics: c.analytics, bossStat: c.bossStat })),
    },
  };
  return origin + "/import#" + encodeURIComponent(JSON.stringify(payload));
}

// A javascript: URL for the bookmarks bar. React blocks javascript: hrefs, so the page sets it with setAttribute.
export const bookmarklet = (origin: string) =>
  "javascript:" +
  encodeURIComponent(
    `(()=>{try{location.href=(${toImportUrl})(localStorage.getItem("character-store"),${JSON.stringify(origin)})}` +
      `catch(e){alert("Maple Boss로 보내지 못했어요. maplescouter 캐릭터 결과 페이지에서 결과가 뜬 뒤에 눌러 주세요.")}})()`,
  );
