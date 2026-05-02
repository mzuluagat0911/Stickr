/**
 * Seed idempotente del catálogo Panini Mundial 2026 (edición PR-International).
 *
 * Supuestos (confirmar con el álbum / checklist oficial Panini):
 * - Total **990** figuritas: 20 intro FWC + 48×20 selecciones + 10 bloque Museo (`MUSEUM`).
 *   - Números 1–20: intro (`team_code` FWC).
 *   - Números 21–980: 48 selecciones × 20 (orden = álbum Panini 2026, `teams-2026.ts`).
 *   - Números 981–990: museo / historia (`team_code` MUSEUM).
 * - Solo 5 figuritas en 16–20 llevan tipo special_* en este modelo; el resto de "specials"
 *   del álbum real (hasta ~68) se pueden recortar después con un UPDATE por rangos de
 *   `sticker_number` o una migración de datos cuando tengamos el PDF oficial.
 * - Legendary vs gold: alternamos en 16–20; el detalle real va en migración posterior.
 * - `player_name` y `player_position` quedan null en slots de jugador (2–19).
 *
 * Ejecución: `pnpm seed:catalog` con `DATABASE_URL` o vars `SUPABASE_DB_*`.
 */
import path from "node:path";

import { sql, type InferInsertModel } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "dotenv";
import postgres from "postgres";

import { stickerCatalog } from "../lib/db/schema";
import { TEAMS_2026 } from "./data/teams-2026";

config({ path: path.resolve(process.cwd(), ".env.local") });

const ALBUM_EDITION = "PR-International";
const PREFIX_MAX = 20;
const TEAM_START = 21;
const MUSEUM_COUNT = 10;
const MUSEUM_START = 981;
/** 20 (FWC) + 960 (48×20) + 10 (MUSEUM) */
const TOTAL_STICKERS = 990;
const STICKERS_PER_TEAM = 20;
const FWC = "FWC";
const MUSEUM = "MUSEUM";

type PostgresErrorCause = { code?: string };

type CatalogRow = InferInsertModel<typeof stickerCatalog>;

function stickerId(n: number): string {
  return `PR-INT-${n}`;
}

function buildPrefixRow(n: number): CatalogRow {
  if (n < 1 || n > PREFIX_MAX) {
    throw new RangeError(`Prefix sticker ${n} out of range`);
  }
  let type: CatalogRow["type"];
  if (n <= 15) {
    type = n === 15 ? "team_photo" : "regular";
  } else {
    type = n % 2 === 0 ? "special_gold" : "special_legendary";
  }
  return {
    id: stickerId(n),
    albumEdition: ALBUM_EDITION,
    stickerNumber: n,
    teamCode: FWC,
    positionInTeam: 0,
    type,
    playerName: null,
    playerPosition: null,
    imageUrl: null,
  };
}

function buildTeamSticker(
  teamCode: string,
  n: number,
  positionInTeam: number,
): CatalogRow {
  let type: CatalogRow["type"];
  if (positionInTeam === 0) type = "team_crest";
  else if (positionInTeam === 1) type = "team_photo";
  else type = "regular";

  return {
    id: stickerId(n),
    albumEdition: ALBUM_EDITION,
    stickerNumber: n,
    teamCode,
    positionInTeam,
    type,
    playerName: null,
    playerPosition: null,
    imageUrl: null,
  };
}

function buildAllRows(): CatalogRow[] {
  if (TEAMS_2026.length !== 48) {
    throw new Error(
      `TEAMS_2026 debe tener 48 equipos; tiene ${TEAMS_2026.length}. Revisá scripts/data/teams-2026.ts`,
    );
  }

  const rows: CatalogRow[] = [];
  for (let n = 1; n <= PREFIX_MAX; n++) {
    rows.push(buildPrefixRow(n));
  }

  let n = TEAM_START;
  for (const team of TEAMS_2026) {
    for (let pos = 0; pos < STICKERS_PER_TEAM; pos++) {
      rows.push(buildTeamSticker(team.code, n, pos));
      n++;
    }
  }

  for (let i = 0; i < MUSEUM_COUNT; i++) {
    const stickerNum = MUSEUM_START + i;
    const type: CatalogRow["type"] =
      i % 2 === 0 ? "special_legendary" : "special_gold";
    rows.push({
      id: stickerId(stickerNum),
      albumEdition: ALBUM_EDITION,
      stickerNumber: stickerNum,
      teamCode: MUSEUM,
      positionInTeam: i,
      type,
      playerName: null,
      playerPosition: null,
      imageUrl: null,
    });
  }

  if (rows.length !== TOTAL_STICKERS) {
    throw new Error(`Filas generadas ${rows.length} !== ${TOTAL_STICKERS}`);
  }
  return rows;
}

function summarize(rows: CatalogRow[]): {
  byTeam: Record<string, number>;
  byType: Record<string, number>;
} {
  const byTeam: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const r of rows) {
    byTeam[r.teamCode] = (byTeam[r.teamCode] ?? 0) + 1;
    byType[r.type] = (byType[r.type] ?? 0) + 1;
  }
  return { byTeam, byType };
}

/** Conexión explícita para evitar fallos parseando DATABASE_URL en algunos shells / env injectors. */
function createSeedPostgres(): ReturnType<typeof postgres> {
  const dbHost = process.env.SUPABASE_DB_HOST?.trim();
  const dbPortRaw = process.env.SUPABASE_DB_PORT?.trim();
  const dbUser = process.env.SUPABASE_DB_USER?.trim();
  const dbPass = process.env.SUPABASE_DB_PASSWORD ?? "";
  const rawDb = process.env.SUPABASE_DB_DATABASE?.trim() ?? "";
  const dbName = rawDb.length > 0 ? rawDb : "postgres";

  if (dbHost && dbUser && dbPass) {
    const port = dbPortRaw ? Number(dbPortRaw) : 5432;
    console.info(
      `[seed] Conectando (SUPABASE_DB_*) usuario=${JSON.stringify(dbUser)} host=${dbHost}:${port} db=${dbName}`,
    );
    return postgres({
      host: dbHost,
      port,
      database: dbName,
      user: dbUser,
      pass: dbPass,
      ssl: "require",
      prepare: false,
      max: 1,
      connect_timeout: 60,
    });
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      [
        "[seed] Falta conexión a Postgres:",
        "  Opción A: DATABASE_URL completa",
        "  Opción B: SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_USER (ej. postgres.MIREF), SUPABASE_DB_PASSWORD, SUPABASE_DB_DATABASE=postgres",
        "  Ejemplo usuario pooler: postgres.ylqjzrncdcvzmvopxikx",
      ].join("\n"),
    );
    process.exit(1);
  }

  let u: URL;
  try {
    u = new URL(databaseUrl.replace(/^postgresql:/i, "https:"));
  } catch {
    console.error(
      "[seed] DATABASE_URL no es una URI válida. Copiala tal cual desde Supabase → Connect.",
    );
    process.exit(1);
  }

  const userDecoded = decodeURIComponent(u.username ?? "");
  const passDecoded = decodeURIComponent(u.password ?? "");
  const pathname = decodeURIComponent(
    (u.pathname || "/postgres").replace(/^\//, ""),
  );

  if (!userDecoded) {
    console.error(
      "[seed] DATABASE_URL sin usuario. En Supabase usa postgres.TUREF (pooler) o postgres (conexión directa al puerto 5432).",
    );
    process.exit(1);
  }

  const port = u.port ? Number(u.port) : 5432;
  const sslParam = u.searchParams.get("sslmode");
  const ssl =
    sslParam === "disable" || sslParam === "false" ? false : "require";

  console.info(
    `[seed] Conectando (DATABASE_URL parseada) usuario=${JSON.stringify(userDecoded)} host=${u.hostname}:${port} db=${pathname}`,
  );

  return postgres({
    host: u.hostname,
    port,
    database: pathname,
    user: userDecoded,
    pass: passDecoded,
    ssl,
    prepare: false,
    max: 1,
    connect_timeout: 60,
  });
}

async function main(): Promise<void> {
  const client = createSeedPostgres();
  const rows = buildAllRows();
  const db = drizzle(client, { schema: { stickerCatalog } });

  const chunk = 100;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    await db
      .insert(stickerCatalog)
      .values(batch)
      .onConflictDoUpdate({
        target: [stickerCatalog.albumEdition, stickerCatalog.stickerNumber],
        set: {
          id: sql`excluded.id`,
          teamCode: sql`excluded.team_code`,
          positionInTeam: sql`excluded.position_in_team`,
          type: sql`excluded.type`,
          playerName: sql`excluded.player_name`,
          playerPosition: sql`excluded.player_position`,
          imageUrl: sql`excluded.image_url`,
        },
      });

    const done = Math.min(i + batch.length, rows.length);
    if (done % 100 === 0 || done === rows.length) {
      console.log(`Progreso: ${done} / ${rows.length} figuritas upsertadas`);
    }
  }

  const [{ count }] = await client<{ count: string }[]>`
    SELECT count(*)::text AS count
    FROM sticker_catalog
    WHERE album_edition = ${ALBUM_EDITION}
  `;
  const totalInDb = Number(count);

  const { byTeam, byType } = summarize(rows);

  console.log("\n--- Resumen (dataset generado) ---");
  console.log(`Total filas en DB para ${ALBUM_EDITION}: ${totalInDb}`);
  console.log(`Esperado: ${TOTAL_STICKERS}`);

  console.log("\nPor tipo:");
  for (const t of Object.keys(byType).sort()) {
    console.log(`  ${t}: ${byType[t]}`);
  }

  console.log("\nPor equipo (48 + FWC + MUSEUM):");
  for (const code of Object.keys(byTeam).sort()) {
    console.log(`  ${code}: ${byTeam[code]}`);
  }

  if (totalInDb !== TOTAL_STICKERS) {
    console.warn(
      `\nAdvertencia: el conteo en DB no coincide con ${TOTAL_STICKERS}. Revisá migraciones, otras ediciones, o permisos.`,
    );
  }

  console.log(
    "\nTODO: Revisar en Drizzle Studio (`pnpm db:studio`) la tabla sticker_catalog.",
  );

  await client.end();
}

main().catch((e) => {
  console.error(e);
  const cause =
    typeof e === "object" &&
    e !== null &&
    "cause" in e &&
    typeof (e as { cause: unknown }).cause === "object" &&
    (e as { cause: unknown }).cause !== null
      ? ((e as { cause: PostgresErrorCause }).cause as PostgresErrorCause)
      : (e as PostgresErrorCause);
  if (
    "code" in (cause ?? {}) &&
    (cause as PostgresErrorCause).code === "28P01"
  ) {
    console.error(
      [
        "",
        "[seed] Error 28P01: contraseña o usuario rechazados por Postgres.",
        "  1) En Supabase: Settings → Database → Reset database password; Connect → URI → copiar de nuevo.",
        "  2) Con pooler (puerto 6543): el usuario suele ser postgres.TUREF (con punto), NO sólo postgres.",
        "  3) Probá también variables SUPABASE_DB_HOST / port / usuario / PASSWORD / database (ver .env.local.example).",
      ].join("\n"),
    );
  }
  process.exit(1);
});
