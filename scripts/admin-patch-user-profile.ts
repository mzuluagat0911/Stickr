/**
 * Parche manual de perfil (soporte / admin).
 *
 * Uso:
 *   pnpm tsx scripts/admin-patch-user-profile.ts --username simon_gutierrez --whatsapp "+573135566449"
 *   pnpm tsx scripts/admin-patch-user-profile.ts --username simon_gutierrez --whatsapp "+573135566449" --album-public
 *
 * Requiere DATABASE_URL en `.env.local`.
 */
import path from "node:path";

import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { userProfiles } from "../lib/db/schema";
import type { ContactMethods, PrivacySettings } from "../lib/types/profile";

config({ path: path.resolve(process.cwd(), ".env.local") });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1]?.trim();
}

/** Normaliza a E.164 (Colombia +57 por defecto si falta prefijo). */
function parseE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return `+57${digits}`;
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }
  throw new Error(`Número inválido: ${raw}`);
}

async function main() {
  const username = arg("username");
  const whatsappRaw = arg("whatsapp");
  const albumPublic = process.argv.includes("--album-public");

  if (!username) {
    console.error("Falta --username");
    process.exit(1);
  }

  const DATABASE_URL = process.env.DATABASE_URL?.trim();
  if (!DATABASE_URL) {
    console.error("Falta DATABASE_URL en .env.local");
    process.exit(1);
  }

  const client = postgres(DATABASE_URL, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(client, { schema: { userProfiles } });

  const rows = await db
    .select({
      id: userProfiles.id,
      username: userProfiles.username,
      contactMethods: userProfiles.contactMethods,
      privacySettings: userProfiles.privacySettings,
    })
    .from(userProfiles)
    .where(eq(userProfiles.username, username))
    .limit(1);

  const row = rows[0];
  if (!row) {
    console.error(`No existe user_profiles con username=${username}`);
    await client.end({ timeout: 5 });
    process.exit(1);
  }

  const patch: {
    contactMethods?: ContactMethods;
    privacySettings?: PrivacySettings;
  } = {};

  if (whatsappRaw) {
    const number = parseE164(whatsappRaw);
    const prev = (row.contactMethods ?? {}) as ContactMethods;
    patch.contactMethods = {
      ...prev,
      whatsapp: { number, visibility: "always" },
      preferred: "whatsapp",
    };
    console.info(`WhatsApp → ${number} (visibility: always)`);
  }

  if (albumPublic) {
    const prev = (row.privacySettings ?? {}) as PrivacySettings;
    patch.privacySettings = {
      ...prev,
      album_visibility: "public",
      proposals_from: prev.proposals_from ?? "anyone",
    };
    console.info("Álbum → public (discover visible)");
  }

  if (!patch.contactMethods && !patch.privacySettings) {
    console.error("Nada que actualizar. Usá --whatsapp y/o --album-public");
    await client.end({ timeout: 5 });
    process.exit(1);
  }

  await db
    .update(userProfiles)
    .set({
      ...(patch.contactMethods ? { contactMethods: patch.contactMethods } : {}),
      ...(patch.privacySettings
        ? { privacySettings: patch.privacySettings }
        : {}),
      lastActiveAt: new Date(),
    })
    .where(eq(userProfiles.id, row.id));

  console.info("OK", { id: row.id, username: row.username });
  await client.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
