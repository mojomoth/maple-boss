// Public interface of the boss PoC. Owner: boss agent. Party PoC imports only listBosses/getBoss.
import type { Boss } from "@/lib/types";
import { BOSSES } from "./data";
import { searchBosses } from "./search";

export function listBosses(): Boss[] {
  return BOSSES;
}

export function getBoss(id: string): Boss | null {
  return BOSSES.find((b) => b.id === id) ?? null;
}

export function findBosses(q: string): Boss[] {
  return searchBosses(BOSSES, q);
}
