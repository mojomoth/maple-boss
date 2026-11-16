import { getBoss } from "@/boss";

// GET /api/boss/normal-kaling -> Boss | 404
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const boss = getBoss((await params).id);
  return boss ? Response.json(boss) : Response.json({ error: "not found" }, { status: 404 });
}
