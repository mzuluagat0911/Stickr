import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const AUTH_ROUTES_PREFIX = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

const SESSION_ROUTE_PREFIXES = [
  "/album",
  "/onboarding",
  "/discover",
  "/messages",
  "/marketplace",
  "/profile",
] as const;

const ONBOARDING_GATED_PREFIXES = [
  "/album",
  "/discover",
  "/messages",
  "/marketplace",
  "/profile",
] as const;

/**
 * Origen para redirecciones: en producción en Vercel, si existe
 * NEXT_PUBLIC_APP_URL, se usa como canonico (dominio custom). En preview y
 * local se usa el host de la petición para no mandar tráfico de preview al dominio prod.
 */
function getRedirectOrigin(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (process.env.VERCEL_ENV === "production" && envUrl) {
    try {
      return new URL(envUrl).origin;
    } catch {
      /* seguir */
    }
  }
  return request.nextUrl.origin;
}

function redirectTo(request: NextRequest, pathname: string, search?: string) {
  const origin = getRedirectOrigin(request);
  const url = new URL(pathname, origin);
  if (search) url.search = search;
  return NextResponse.redirect(url);
}

function matchesAnyPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES_PREFIX.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function requiresSession(pathname: string) {
  return matchesAnyPrefix(pathname, SESSION_ROUTE_PREFIXES);
}

function requiresOnboardingComplete(pathname: string) {
  return matchesAnyPrefix(pathname, ONBOARDING_GATED_PREFIXES);
}

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth/")) {
    return response;
  }

  if (!user && requiresSession(pathname)) {
    const url = new URL("/login", getRedirectOrigin(request));
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && supabase) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const onboardingDone = profile?.onboarding_completed === true;

    if (isAuthRoute(pathname)) {
      return redirectTo(request, onboardingDone ? "/album" : "/onboarding");
    }

    if (onboardingDone && pathname.startsWith("/onboarding")) {
      return redirectTo(request, "/album");
    }

    if (!onboardingDone && requiresOnboardingComplete(pathname)) {
      return redirectTo(request, "/onboarding");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
