import { getBoss } from "@/boss";
import { notAllowed } from "@/lib/http";

// GET /api/boss/normal-kaling -> Boss | 404
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const boss = getBoss((await params).id);
  return boss ? Response.json(boss) : Response.json({ error: "없는 보스예요." }, { status: 404 });
}

const no = notAllowed("GET");
export { no as POST, no as PUT, no as PATCH, no as DELETE };
