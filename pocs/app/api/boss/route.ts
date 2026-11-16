import { findBosses } from "@/boss";
import { notAllowed } from "@/lib/http";

// GET /api/boss?q=카링 -> Boss[] (empty q = all bosses)
export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return Response.json(findBosses(q.slice(0, 50)));
}

const no = notAllowed("GET");
export { no as POST, no as PUT, no as PATCH, no as DELETE };
