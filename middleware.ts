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
    const url = request.nextUrl.clone();
    url.pathname = "/login";
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
      const url = request.nextUrl.clone();
      url.pathname = onboardingDone ? "/album" : "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (onboardingDone && pathname.startsWith("/onboarding")) {
      const url = request.nextUrl.clone();
      url.pathname = "/album";
      return NextResponse.redirect(url);
    }

    if (!onboardingDone && requiresOnboardingComplete(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
