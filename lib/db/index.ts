import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL no está definida. Usá variables de entorno en runtime (por ejemplo .env.local en desarrollo).",
  );
}

/**
 * Cliente Postgres con pool acotado para no saturar el plan free de Supabase.
 *
 * Plan NANO: ~60 conexiones máx compartidas.
 * Si abrimos 10 (default) por instancia × hot-reloads, se acumulan
 * conexiones zombie hasta marcar la DB como Unhealthy.
 *
 * Notas:
 * - prepare: false  → requerido para Supabase Transaction Pooler (puerto 6543)
 * - max: 1          → en serverless cada invocación reusa la misma instancia,
 *                     1 conexión por instancia es suficiente.
 * - idle_timeout    → cerrar conexiones rápido cuando no hay actividad.
 * - connect_timeout → fallar rápido si la DB está caída en lugar de colgar.
 */
const client = postgres(connectionString, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { client };
