import { findBosses } from "@/boss";

// GET /api/boss?q=카링 -> Boss[] (empty q = all bosses)
export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return Response.json(findBosses(q.slice(0, 50)));
}
