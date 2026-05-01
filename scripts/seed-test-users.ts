/**
 * Crea 5 usuarios de prueba en Supabase Auth y completa sus filas en `user_profiles`
 * (ubicación en CABA, CDMX, Bogotá, Madrid y São Paulo).
 *
 * Requiere en `.env.local`:
 * - `NEXT_PUBLIC_SUPABASE_URL`
 * - `SUPABASE_SERVICE_ROLE_KEY` (solo este script; no en el cliente)
 * - `DATABASE_URL` (misma DB que Supabase; PostGIS habilitado)
 *
 * Contraseña por defecto: `SEED_TEST_USER_PASSWORD` o `DevSeedStickr123!`.
 *
 * Idempotente por email: si el usuario ya existe, solo actualiza el perfil.
 */
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { userProfiles } from "../lib/db/schema";

config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_TEST_USER_PASSWORD ?? "DevSeedStickr123!";

type SeedSpec = {
  email: string;
  username: string;
  displayName: string;
  countryCode: string;
  city: string;
  languages: string[];
  albumEdition: string;
  lat: number;
  lon: number;
};

const SEEDS: SeedSpec[] = [
  {
    email: "seed-caba@stickr.local",
    username: "seed_caba",
    displayName: "Coleccionista CABA",
    countryCode: "AR",
    city: "Buenos Aires",
    languages: ["es", "en"],
    albumEdition: "PR-International",
    lat: -34.6037,
    lon: -58.3816,
  },
  {
    email: "seed-cdmx@stickr.local",
    username: "seed_cdmx",
    displayName: "Coleccionista CDMX",
    countryCode: "MX",
    city: "Ciudad de México",
    languages: ["es"],
    albumEdition: "PR-International",
    lat: 19.4326,
    lon: -99.1332,
  },
  {
    email: "seed-bogota@stickr.local",
    username: "seed_bogota",
    displayName: "Coleccionista Bogotá",
    countryCode: "CO",
    city: "Bogotá",
    languages: ["es", "en"],
    albumEdition: "PR-International",
    lat: 4.711,
    lon: -74.0721,
  },
  {
    email: "seed-madrid@stickr.local",
    username: "seed_madrid",
    displayName: "Coleccionista Madrid",
    countryCode: "ES",
    city: "Madrid",
    languages: ["es"],
    albumEdition: "PR-International",
    lat: 40.4168,
    lon: -3.7038,
  },
  {
    email: "seed-saopaulo@stickr.local",
    username: "seed_saopaulo",
    displayName: "Coleccionista São Paulo",
    countryCode: "BR",
    city: "São Paulo",
    languages: ["pt", "es"],
    albumEdition: "PR-International",
    lat: -23.5505,
    lon: -46.6333,
  },
];

async function main() {
  if (!DATABASE_URL || !SUPABASE_URL || !SERVICE_ROLE) {
    console.error(
      "Faltan variables: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const client = postgres(DATABASE_URL, { prepare: false });
  const db = drizzle(client, { schema: { userProfiles } });

  const { data: listData, error: listError } = await admin.auth.admin.listUsers(
    { page: 1, perPage: 1000 },
  );

  if (listError) {
    console.error("listUsers", listError.message);
    await client.end({ timeout: 5 });
    process.exit(1);
  }

  const knownEmails = new Map(
    listData.users.filter((u) => u.email).map((u) => [u.email!, u.id]),
  );

  for (const spec of SEEDS) {
    let userId = knownEmails.get(spec.email);

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: spec.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: spec.displayName },
      });

      if (error) {
        console.error("createUser", spec.email, error.message);
        continue;
      }

      userId = data.user?.id;
      if (userId && data.user?.email) {
        knownEmails.set(data.user.email, userId);
      }
    }

    if (!userId) {
      console.error("Sin user id", spec.email);
      continue;
    }

    await db
      .update(userProfiles)
      .set({
        username: spec.username,
        displayName: spec.displayName,
        countryCode: spec.countryCode,
        city: spec.city,
        languages: spec.languages,
        albumEdition: spec.albumEdition,
        onboardingCompleted: true,
        geoOptIn: true,
      })
      .where(eq(userProfiles.id, userId));

    const wkt = `SRID=4326;POINT(${spec.lon} ${spec.lat})`;

    await client`
      UPDATE user_profiles
      SET location_jittered = ST_GeogFromText(${wkt})::geography
      WHERE id = ${userId}::uuid
    `;

    console.log("OK", spec.email, userId);
  }

  await client.end({ timeout: 5 });
  console.log("Listo: perfiles de prueba actualizados (máx. 5 usuarios).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
