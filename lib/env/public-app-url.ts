/**
 * URL pública para callbacks (email, OAuth) y enlaces generados en servidor.
 * En Edge (middleware) no existe `VERCEL_URL` en todos los runtimes; preferí
 * `NEXT_PUBLIC_APP_URL` en producción o el origen de la petición en preview/dev.
 */
export function getPublicAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  return "http://localhost:3000";
}
