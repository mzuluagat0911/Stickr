import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

export type SessionUser = {
  id: string;
  email?: string;
};

/**
 * Refresca la sesión de Supabase y propaga cookies en la respuesta.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: SessionUser | null;
  supabase: SupabaseClient | null;
}> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error("[middleware] Faltan variables públicas de Supabase.");
    return { response, user: null, supabase: null };
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn("[middleware] getUser:", error.message);
  }

  return {
    response,
    user: user ? { id: user.id, email: user.email ?? undefined } : null,
    supabase,
  };
}
