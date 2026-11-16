import { dbInfo, query } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/health -> { ok, db: "postgres" | "pglite", persistent } (persistent: false = data resets on cold start)
export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ ok: true, db: dbInfo.kind, persistent: dbInfo.persistent });
  } catch (e) {
    console.error("health:", e);
    return Response.json({ ok: false, db: dbInfo.kind, persistent: dbInfo.persistent, error: "저장소에 연결하지 못했어요." }, { status: 503 });
  }
}
