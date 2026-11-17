// Next answers a method a route does not export with an empty 405. Routes export this for the rest, so every
// /api failure is { error } like the others. `allow` lists the methods the route has.
export const notAllowed = (allow: string) => (req: Request) =>
  Response.json({ error: `이 주소는 ${req.method} 요청을 받지 않아요.` }, { status: 405, headers: { allow } });

// The body as text, or null once it passes max bytes. Reads the stream itself, so a body without (or with a
// false) content-length is cut off at the limit instead of being buffered whole.
export async function readText(req: Request, max: number): Promise<string | null> {
  if (Number(req.headers.get("content-length")) > max) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// The rest of the body is never read, so the connection cannot carry another request: say so (RFC 9110 15.5.14).
export const tooLarge = (error: string) => Response.json({ error }, { status: 413, headers: { connection: "close" } });

// Party bodies are a few names and ids; anything near this size is not a real request.
const SMALL_BODY = 16_000;
export const TOO_LARGE = Symbol("too large");

// Parsed JSON body (null when it isn't JSON), or TOO_LARGE past SMALL_BODY bytes.
export async function readSmallJson(req: Request): Promise<unknown> {
  const text = await readText(req, SMALL_BODY);
  if (text === null) return TOO_LARGE;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
