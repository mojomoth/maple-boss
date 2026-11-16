import "server-only";
import { execFile } from "node:child_process";
import path from "node:path";
import type { Character } from "@/lib/types";

const PY = path.join(process.cwd(), "crawler", ".venv", "bin", "python");
const SCRIPT = path.join(process.cwd(), "crawler", "crawl.py");

export class CrawlError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Spawns the headful crawler; a human may need to click the Turnstile check in the window it opens.
export function crawlCharacter(name: string): Promise<{ character: Character; raw: unknown }> {
  return new Promise((resolve, reject) => {
    execFile(PY, [SCRIPT, name], { timeout: 200_000, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        if (err.code === 2) return reject(new CrawlError(`캐릭터를 찾을 수 없어요: ${name}`, 404));
        if (err.killed || /timeout/i.test(stderr)) return reject(new CrawlError("HIL 확인 필요/시간초과", 504));
        return reject(new CrawlError(`크롤러 실패: ${stderr.trim().split("\n").pop() ?? err.message}`, 502));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new CrawlError("크롤러 출력 파싱 실패", 502));
      }
    });
  });
}
