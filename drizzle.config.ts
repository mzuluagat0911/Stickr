import path from "node:path";

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: path.resolve(process.cwd(), ".env.local") });

const argv = process.argv.join(" ");
const requiresDatabaseUrl =
  argv.includes("push") || argv.includes("studio") || argv.includes("migrate");

const databaseUrl = process.env.DATABASE_URL;
if (requiresDatabaseUrl && !databaseUrl) {
  throw new Error(
    "DATABASE_URL no está definida. Copiá .env.local.example a .env.local y configurá la cadena de Supabase.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      databaseUrl ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
  },
});
