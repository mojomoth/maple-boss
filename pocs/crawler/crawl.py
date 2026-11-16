"""Crawl one character from maplescouter.com (human-in-the-loop Turnstile).

usage: crawl.py <name>               # opens a visible browser; a human clicks the check
       crawl.py --from-file <path>   # parse a saved character-store / searchResult JSON
stdout: {"character": {...}, "raw": <state.searchResult>}
exit:   0 ok, 1 error/timeout, 2 character not found
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
SAMPLES = HERE.parent.parent / "docs" / "research" / "samples"
SITE = "https://maplescouter.com"
TIMEOUT_S = 180
HIL_TEXT = "사람 확인이 필요해요"
# shortcut: guessed not-found copy, never observed live; update after a real miss is seen.
NOT_FOUND_TEXTS = ("캐릭터를 찾을 수 없", "존재하지 않는 캐릭터", "검색 결과가 없")


def to_character(sr: dict) -> dict:
    info = sr["userApiData"]["info"]
    calc = sr["calculatedData"]
    image = info.get("character_image") or ""
    if image.startswith("/"):
        image = SITE + image
    return {
        "name": info["character_name"],
        "world": info["world_name"],
        "job": info["character_class"],
        "level": int(info["character_level"]),
        "imageUrl": image,
        "combatPower": int(calc["combatPower"]),
        "boss300Stat": int(calc["boss300_stat"]),
        "boss380Stat": int(calc["boss380_stat"]),
        "source": "maplescouter",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }


def search_result(store: dict) -> dict:
    # accept the whole localStorage value, its `state`, or searchResult itself
    s = store.get("state", store)
    return s.get("searchResult", s)


def crawl(name: str) -> dict:
    from scrapling.fetchers import StealthySession

    out: dict = {}

    def wait_for_data(page):
        warned = False
        deadline = time.time() + TIMEOUT_S
        while time.time() < deadline:
            try:
                raw = page.evaluate("() => localStorage.getItem('character-store')")
                body = page.inner_text("body")
            except Exception:  # page navigating (e.g. after the check); scrapling would swallow it and stop polling
                page.wait_for_timeout(1000)
                continue
            if raw:
                sr = search_result(json.loads(raw))
                info = (sr.get("userApiData") or {}).get("info") or {}
                if info.get("character_name") == name:  # placeholder is '으낭다'
                    out["sr"] = sr
                    return
            if any(t in body for t in NOT_FOUND_TEXTS):
                out["not_found"] = True
                return
            if HIL_TEXT in body and not warned:
                print("HIL: 브라우저 창에서 '사람인지 확인' 체크박스를 눌러주세요", file=sys.stderr, flush=True)
                warned = True
            page.wait_for_timeout(1000)
        out["timeout"] = True

    # Policy: no automatic Turnstile solving. A human clicks the check in this headful window.
    with StealthySession(
        headless=False,
        user_data_dir=str(HERE / ".profile"),
        solve_cloudflare=False,
        timeout=60_000,
        retries=1,
        block_ads=True,  # without it page 'load' never fires (ad scripts) and goto times out
    ) as session:
        session.fetch(f"{SITE}/ko/result?name={quote(name)}", page_action=wait_for_data)

    if out.get("not_found"):
        print(f"not found: {name}", file=sys.stderr)
        sys.exit(2)
    if "sr" not in out:
        print("timeout: HIL 확인 필요/시간초과", file=sys.stderr)
        sys.exit(1)
    return out["sr"]


def main(argv: list[str]) -> None:
    if len(argv) == 2 and argv[0] == "--from-file":
        sr = search_result(json.loads(Path(argv[1]).read_text()))
    elif len(argv) == 1:
        sr = crawl(argv[0])
        SAMPLES.mkdir(parents=True, exist_ok=True)
        (SAMPLES / f"{argv[0]}.json").write_text(json.dumps(sr, ensure_ascii=False))
    else:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    print(json.dumps({"character": to_character(sr), "raw": sr}, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1:])
