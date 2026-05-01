/**
 * Seed idempotente del catálogo Panini Mundial 2026 (edición PR-International).
 *
 * Supuestos (confirmar con el álbum / checklist oficial Panini):
 * - El álbum tiene 980 figuritas. La suma 15 (tournament) + 68 (specials) + 960 (48×20) = 1043,
 *   por lo que NO cierra con 980. Usamos en su lugar:
 *   - Números 1–20: bloque "álbum / FIFA" (`team_code` FWC), sin inventar nombres.
 *   - Números 21–980: 48 selecciones × 20 figuritas (escudo, foto grupal, 18 slots de jugador).
 * - Solo 5 figuritas en 16–20 llevan tipo special_* en este modelo; el resto de "specials"
 *   del álbum real (hasta ~68) se pueden recortar después con un UPDATE por rangos de
 *   `sticker_number` o una migración de datos cuando tengamos el PDF oficial.
 * - Legendary vs gold: alternamos en 16–20; el detalle real va en migración posterior.
 * - `player_name` y `player_position` quedan null en slots de jugador (2–19).
 *
 * Ejecución: `pnpm seed:catalog` (requiere DATABASE_URL en .env.local).
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
/** Prefijo alineado a 980 total: 20 + 48×20 = 980 */
const PREFIX_MAX = 20;
const TEAM_START = 21;
const TOTAL_STICKERS = 980;
const STICKERS_PER_TEAM = 20;
const FWC = "FWC";

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

  if (rows.length !== TOTAL_STICKERS) {
    throw new Error(`Filas generadas ${rows.length} !== ${TOTAL_STICKERS}`);
  }
  if (n - 1 !== TOTAL_STICKERS) {
    throw new Error(`Último número esperado ${TOTAL_STICKERS}, fue ${n - 1}`);
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

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "Falta DATABASE_URL. Copiá .env.local.example a .env.local y definí la conexión a Supabase/Postgres.",
    );
    process.exit(1);
  }

  const rows = buildAllRows();
  const client = postgres(databaseUrl, { prepare: false, max: 1 });
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

  console.log("\nPor equipo (48 + FWC):");
  for (const code of Object.keys(byTeam).sort()) {
    console.log(`  ${code}: ${byTeam[code]}`);
  }

  if (totalInDb !== TOTAL_STICKERS) {
    console.warn(
      "\nAdvertencia: el conteo en DB no coincide con 980. Revisá migraciones, otras ediciones, o permisos.",
    );
  }

  console.log(
    "\nTODO: Revisar en Drizzle Studio (`pnpm db:studio`) la tabla sticker_catalog.",
  );

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
