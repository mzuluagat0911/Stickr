import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL no está definida. Usá variables de entorno en runtime (por ejemplo .env.local en desarrollo).",
  );
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { client };
