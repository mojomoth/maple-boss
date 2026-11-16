import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { parseCharacter } from "../../character/parse.ts";
import { bookmarklet, scouterUrl, toImportUrl } from "./bookmarklet.ts";

const sr = JSON.parse(readFileSync(new URL("../../../docs/research/samples/강은호.json", import.meta.url), "utf8"));
const store = JSON.stringify({ state: { searchResult: sr, isLoading: false, error: null }, version: 0 });
const ORIGIN = "https://maple-boss.example";
const now = new Date("2026-11-17T00:00:00Z");

const hashOf = (url: string) => {
  assert.ok(url.startsWith(`${ORIGIN}/import#`), url.slice(0, 80));
  return decodeURIComponent(url.slice(url.indexOf("#") + 1));
};

test("toImportUrl trims the store to the payload parse.ts accepts, field for field", () => {
  const url = toImportUrl(store, ORIGIN);
  const sent = hashOf(url);
  assert.deepEqual(parseCharacter(sent, now), parseCharacter(sr, now)); // same character, same trimmed payload
  assert.deepEqual(JSON.parse(sent), parseCharacter(sr, now).payload); // nothing extra rides along
  assert.ok(url.length < 64_000, `URL is ${url.length} chars`);
});

test("toImportUrl throws without a maplescouter result", () => {
  for (const s of [null, "", "{}", JSON.stringify({ state: { searchResult: null } }), JSON.stringify({ state: { searchResult: { userApiData: {} } } }), "{oops"])
    assert.throws(() => toImportUrl(s, ORIGIN), Error, String(s));
});

// Runs the real bookmarklet text the way a browser does: decode the javascript: URL, evaluate it with only the
// page's globals. This also proves the function survives being serialised (no outside references).
function click(href: string, stored: string | null) {
  assert.ok(href.startsWith("javascript:"));
  const page = { href: "https://maplescouter.com/ko/result?name=x" };
  const alerts: string[] = [];
  runInNewContext(decodeURIComponent(href.slice("javascript:".length)), {
    location: page,
    localStorage: { getItem: (k: string) => (k === "character-store" ? stored : null) },
    alert: (m: string) => alerts.push(m),
  });
  return { href: page.href, alerts };
}

test("the bookmarklet navigates to /import with the trimmed payload", () => {
  const r = click(bookmarklet(ORIGIN), store);
  assert.deepEqual(r.alerts, []);
  assert.equal(r.href, toImportUrl(store, ORIGIN));
  assert.equal(parseCharacter(hashOf(r.href), now).character.name, "강은호");
});

test("the bookmarklet stays on the page and explains itself when there is nothing to send", () => {
  const r = click(bookmarklet(ORIGIN), null);
  assert.equal(r.href, "https://maplescouter.com/ko/result?name=x");
  assert.equal(r.alerts.length, 1);
  assert.match(r.alerts[0], /maplescouter 캐릭터 결과 페이지/);
});

test("scouterUrl encodes the nickname", () => {
  assert.equal(scouterUrl("강은호"), "https://maplescouter.com/ko/result?name=%EA%B0%95%EC%9D%80%ED%98%B8");
  assert.equal(scouterUrl("a&b c"), "https://maplescouter.com/ko/result?name=a%26b%20c");
});
