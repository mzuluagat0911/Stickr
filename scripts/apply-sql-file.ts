/**
 * Aplica un archivo .sql contra DATABASE_URL.
 * Uso: pnpm tsx scripts/apply-sql-file.ts lib/db/migrations/0025_....sql
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";
import postgres from "postgres";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: pnpm tsx scripts/apply-sql-file.ts <archivo.sql>");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("Falta DATABASE_URL");
    process.exit(1);
  }
  const sql = readFileSync(path.resolve(process.cwd(), file), "utf8");
  const db = postgres(url, { max: 1, prepare: false });
  await db.unsafe(sql);
  await db.end({ timeout: 5 });
  console.info("OK", file);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
