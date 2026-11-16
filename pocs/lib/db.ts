import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const file = process.env.MAPLE_DB ?? path.join(process.cwd(), "data", "maple.db");
mkdirSync(path.dirname(file), { recursive: true });

const g = globalThis as unknown as { __mapleDb?: DatabaseSync };
export const db = (g.__mapleDb ??= new DatabaseSync(file));

// Each PoC owns its tables. Add `CREATE TABLE IF NOT EXISTS` in your own module's schema.ts
// and call it from there; don't edit another PoC's tables.
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
