import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getPublicSupabaseKey,
  getPublicSupabaseUrl,
} from "@/lib/supabase/public-env";

export async function createClient() {
  const url = getPublicSupabaseUrl();
  const key = getPublicSupabaseKey();
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y una clave pública: NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Server Component: las cookies solo pueden setearse en Server Action / Route Handler */
        }
      },
    },
  });
}
