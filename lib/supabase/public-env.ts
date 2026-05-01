/**
 * URL y clave públicas para el cliente Supabase (@supabase/ssr).
 * Compatible con JWT anon (NEXT_PUBLIC_SUPABASE_ANON_KEY) y claves
 * publishable del dashboard nuevo (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).
 */
export function getPublicSupabaseUrl(): string | undefined {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return v?.length ? v : undefined;
}

export function getPublicSupabaseKey(): string | undefined {
  const jwt = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const v = jwt?.length ? jwt : pub?.length ? pub : undefined;
  return v;
}

export function hasPublicSupabaseConfig(): boolean {
  return Boolean(getPublicSupabaseUrl() && getPublicSupabaseKey());
}
