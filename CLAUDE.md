# CLAUDE

## Estado actual (Fase 1 cerrada)

- **Repo GitHub:** [mzuluagat0911/Stickr](https://github.com/mzuluagat0911/Stickr) (`origin` configurado en local). **Deploy Vercel:** seguí [docs/deploy.md](docs/deploy.md) — la URL del proyecto y los deploys los obtenés en el dashboard cuando importes el repo.
- **CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — en cada PR/push a `main`: `pnpm install`, `lint`, `build` (env mock), `vitest run`. Vitest excluye Playwright (`tests/e2e`); hay un placeholder en `tests/unit/`.
- **Health:** `GET /api/health` → `{ status, commit: VERCEL_GIT_COMMIT_SHA | null, timestamp }`.
- **Seguridad (headers):** `next.config.ts` — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. **Redirects:** `/home` y `/inicio` → `/`.
- **URL pública:** [`lib/env/public-app-url.ts`](lib/env/public-app-url.ts) — `getPublicAppUrl()` para emails/OAuth en server. **Middleware:** `getRedirectOrigin()`: en **Vercel Production** + `NEXT_PUBLIC_APP_URL` usa origen canónico; en **Preview/dev** el host de la petición (evita mandar previews al dominio prod). OAuth cliente usa `NEXT_PUBLIC_APP_URL` o `window.location.origin`.
- Next.js (App Router) + TypeScript + Tailwind + ESLint + `@/`. **Turbopack `root`** en `next.config.ts` para workspace/lockfiles fuera del app dir.
- Drizzle + Supabase (SSR cookies, anon en cliente). **No** `service_role` en cliente. `.env.local` en `.gitignore`; variables reales en Vercel y local.
- **Shell app:** sidebar + bottom nav, placeholders Fase 2/3, tema `stickr-theme`, Sonner, onboarding, auth email/OAuth.
- **E2E:** `pnpm test:e2e` (Playwright), no en CI por defecto.

### OAuth / Supabase (recordatorio)

En **Authentication → URL configuration**: `Site URL` y redirect `{APP_URL}/auth/callback` para prod y cada preview donde pruebes OAuth. Detalle en sección anterior del historial / `docs/deploy.md`.

---

## Próximos pasos: Fase 2 — Perfil de usuario, marcado de álbum, matching

1. **Perfil:** formulario real en `/profile/edit`, avatars, bio, preferencias de intercambio, visibilidad / geo acorde a `geo_opt_in`.
2. **Álbum:** marcar figuritas coleccionadas (UI + modelo de datos ya orientado a `sticker_catalog` y colección), progreso sobre 980, enlace al catálogo.
3. **Matching / descubrir:** usar `location_jittered` y perfiles seed para probar mapa/lista de coleccionistas cercanos, filtros por idioma / edición / necesidades de intercambio.
4. **Mensajes:** hilos mínimos vinculados a propuestas de intercambio (cuando exista el flujo).
5. **Calidad:** ampliar tests unitarios; opcional E2E estable en CI con secretos en GitHub Actions.

---

### OAuth en Supabase (Google y Apple)

1. **Authentication → URL configuration**
   - **Site URL**: mismo valor que `NEXT_PUBLIC_APP_URL` (producción o preview activo).
   - **Redirect URLs**: `{NEXT_PUBLIC_APP_URL}/auth/callback` por cada entorno que uses.

2. **Google** — [Google Cloud Console](https://console.cloud.google.com/): **Authorized redirect URIs** = `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.

3. **Apple** — Return URL = `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.

4. **Email** — plantillas y confirmación según entorno.
