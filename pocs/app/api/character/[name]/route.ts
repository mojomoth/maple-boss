import { notAllowed } from "@/lib/http";
import { removeCharacter } from "../remove";

// DELETE /api/character/%EA%B3%A0%EB%94%A9 -> 204 | 404 (names 'import' and 'rates' are answered by those routes)
export async function DELETE(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  return removeCharacter((await params).name); // already decoded by Next
}

const no = notAllowed("DELETE");
export { no as GET, no as POST, no as PUT, no as PATCH };
