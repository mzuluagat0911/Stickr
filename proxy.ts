import { NextResponse } from "next/server";

export function proxy() {
  // Temporalmente desactivado en Edge por estabilidad en Vercel.
  // La autorización y redirecciones siguen verificándose en páginas y server actions.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
