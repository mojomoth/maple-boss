import { dbInfo, query } from "@/lib/db";
import { notAllowed } from "@/lib/http";

// GET /api/health -> { ok, db: "postgres" | "pglite", persistent } (persistent: false = per-instance temporary storage:
// data may be missing on the next request and is gone after a cold start)
export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ ok: true, db: dbInfo.kind, persistent: dbInfo.persistent });
  } catch (e) {
    console.error("health:", e);
    return Response.json({ ok: false, db: dbInfo.kind, persistent: dbInfo.persistent, error: "저장소에 연결하지 못했어요." }, { status: 503 });
  }
}

const no = notAllowed("GET");
export { no as POST, no as PUT, no as PATCH, no as DELETE };
