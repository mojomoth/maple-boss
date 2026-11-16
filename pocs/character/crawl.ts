import "server-only";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { ParseError, parseCharacter } from "./parse";

const PY = path.join(process.cwd(), "crawler", ".venv", "bin", "python");
const SCRIPT = path.join(process.cwd(), "crawler", "crawl.py");

export class CrawlError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Local dev only: never on Vercel, and only where the crawler's venv was set up.
export const crawlerAvailable = () => !process.env.VERCEL && existsSync(PY);

// Spawns the headful crawler (local only; the one caller, POST /api/character, checks crawlerAvailable() first and
// answers 501 itself); a human may need to click the Turnstile check in the window it opens.
// stdout is the raw searchResult, mapped by parse.ts like any import.
export function crawlCharacter(name: string): Promise<ReturnType<typeof parseCharacter>> {
  return new Promise((resolve, reject) => {
    execFile(PY, [SCRIPT, name], { timeout: 200_000, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      // The user sees a short Korean reason; the crawler's own output goes to the server log only.
      if (err) {
        if (err.code === 2) return reject(new CrawlError(`maplescouter에서 ‘${name}’ 캐릭터를 찾지 못했어요. 닉네임을 확인해 주세요.`, 404));
        if (err.killed || /timeout/i.test(stderr))
          return reject(new CrawlError("3분 안에 불러오지 못했어요. 새 창에서 ‘사람인지 확인’을 누른 뒤 다시 시도해 주세요.", 504));
        console.error("crawler:", stderr.trim().split("\n").pop() ?? err.message);
        return reject(new CrawlError("maplescouter에서 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.", 502));
      }
      try {
        resolve(parseCharacter(stdout));
      } catch (e) {
        console.error("crawler output:", e instanceof ParseError ? e.message : e);
        reject(new CrawlError("maplescouter에서 받은 데이터를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.", 502));
      }
    });
  });
}
