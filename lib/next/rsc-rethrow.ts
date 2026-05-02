/**
 * Errores de control de flujo de Next/React que deben propagarse (no tragar en try/catch).
 * @see https://nextjs.org/docs/app/building-your-application/routing/redirecting
 */
export function shouldRethrowFromRsc(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const digest = (e as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return (
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_NOT_FOUND") ||
    digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") ||
    digest.startsWith("NEXT_FORBIDDEN") ||
    digest.startsWith("NEXT_UNAUTHORIZED")
  );
}
