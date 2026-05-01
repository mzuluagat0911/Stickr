import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const AUTH_ROUTES_PREFIX = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES_PREFIX.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function requiresSession(pathname: string) {
  return pathname.startsWith("/album") || pathname.startsWith("/onboarding");
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

    if (!onboardingDone && pathname.startsWith("/album")) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
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
