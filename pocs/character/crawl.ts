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

// Spawns the headful crawler (local only); a human may need to click the Turnstile check in the window it opens.
// stdout is the raw searchResult, mapped by parse.ts like any import.
export function crawlCharacter(name: string): Promise<ReturnType<typeof parseCharacter>> {
  if (!crawlerAvailable())
    return Promise.reject(new CrawlError("이 서버에서는 닉네임으로 불러올 수 없어요. maplescouter 결과 페이지에서 가져오기를 써 주세요.", 501));
  return new Promise((resolve, reject) => {
    execFile(PY, [SCRIPT, name], { timeout: 200_000, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        if (err.code === 2) return reject(new CrawlError(`캐릭터를 찾을 수 없어요: ${name}`, 404));
        if (err.killed || /timeout/i.test(stderr)) return reject(new CrawlError("HIL 확인 필요/시간초과", 504));
        return reject(new CrawlError(`크롤러 실패: ${stderr.trim().split("\n").pop() ?? err.message}`, 502));
      }
      try {
        resolve(parseCharacter(stdout));
      } catch (e) {
        reject(new CrawlError(e instanceof ParseError ? `크롤러 출력이 올바르지 않아요: ${e.message}` : "크롤러 출력 파싱 실패", 502));
      }
    });
  });
}
