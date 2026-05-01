import { createBrowserClient } from "@supabase/ssr";

import {
  getPublicSupabaseKey,
  getPublicSupabaseUrl,
} from "@/lib/supabase/public-env";

export function createClient() {
  const url = getPublicSupabaseUrl();
  const key = getPublicSupabaseKey();
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o una clave pública (ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  return createBrowserClient(url, key);
}
