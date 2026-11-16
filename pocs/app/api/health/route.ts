import { db } from "@/lib/db";
export const runtime = "nodejs";
export function GET() {
  return Response.json(db.prepare("select sqlite_version() as v").get());
}
