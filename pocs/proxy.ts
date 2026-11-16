import type { NextRequest } from "next/server";

// The one /api failure no route handler sees: a path whose percent-encoding does not decode
// (DELETE /api/character/%E0%A4%A). Next would answer it with its HTML 400 page; this gives it the { error } JSON
// every other API failure has. Every other /api request passes through untouched.
export function proxy(req: NextRequest) {
  try {
    decodeURIComponent(req.nextUrl.pathname);
  } catch {
    return Response.json({ error: "주소에 잘못된 % 인코딩이 있어요." }, { status: 400 });
  }
}

export const config = { matcher: "/api/:path*" };
