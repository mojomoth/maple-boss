import type { NextRequest } from "next/server";

// Methods that change data. GET, HEAD and OPTIONS only read.
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

// A browser request to change data that another site started (FN-7). The app's own pages call the API from the same
// origin, the bookmarklet included (it opens /import, and /import posts). Browsers send Sec-Fetch-Site; older ones
// send Origin on every POST and DELETE. A request with neither is not from a browser page (curl, npm run smoke).
function crossSite(req: NextRequest) {
  if (SAFE.has(req.method)) return false;
  const site = req.headers.get("sec-fetch-site");
  if (site) return site !== "same-origin" && site !== "none";
  const origin = req.headers.get("origin");
  if (origin === null) return false;
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host"))?.split(",")[0].trim();
  try {
    return new URL(origin).host !== host;
  } catch {
    return true; // "null" (sandboxed frame, file:) or junk
  }
}

// Two /api failures no route handler sees:
// - a cross-site POST or DELETE (a text/plain form post needs no CORS preflight, so it would reach the handler);
// - a path whose percent-encoding does not decode (DELETE /api/character/%E0%A4%A), which Next would answer with
//   its HTML 400 page. (On Vercel the edge already refuses that one with a plain-text 400; this never runs for it.)
// Both get the { error } JSON every other API failure has. Every other /api request passes through untouched.
export function proxy(req: NextRequest) {
  if (crossSite(req)) return Response.json({ error: "다른 사이트에서 보낸 요청은 받지 않아요." }, { status: 403 });
  try {
    decodeURIComponent(req.nextUrl.pathname);
  } catch {
    return Response.json({ error: "주소에 잘못된 % 인코딩이 있어요." }, { status: 400 });
  }
}

export const config = { matcher: "/api/:path*" };
