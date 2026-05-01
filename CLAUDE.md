# CLAUDE

## Estado actual

- Next.js (App Router) + TypeScript + Tailwind + ESLint + alias `@/`. Ver `AGENTS.md` por cambios de la versión de Next.
- Drizzle + Supabase (cliente anon en browser; cookies con `@supabase/ssr` en server y middleware). **No** usar `SUPABASE_SERVICE_ROLE_KEY` en cliente; solo en server actions / route handlers donde sea imprescindible (no está en el flujo auth actual).
- **`lib/supabase/`**: `server.ts` (`createServerClient`), `browser.ts` (`createBrowserClient`), `middleware.ts` (`updateSession` con `getAll`/`setAll`).
- **`middleware.ts` (raíz)**: refresca sesión; rutas protegidas (`/album`, `/onboarding`); redirige a `/login` si no hay usuario; si hay sesión evita `/login`, `/signup`, etc. y envía a `/album` u `/onboarding` según `onboardingCompleted`.
- **Auth UI**: `(auth)/login`, `signup`, `forgot-password`, `reset-password`; `auth/callback`, `auth/confirm`; server actions en `app/actions/auth.ts` con Zod (`lib/validations/auth.ts`) y toasts con Sonner (`app/providers.tsx`).
- **OAuth**: botones Google y Apple listos; activar proveedores en Supabase (ver abajo).
- **Onboarding**: `(app)/onboarding` con formulario (username, país, ciudad, idiomas, edición, geo).
- **`user_profiles`**: columnas `onboardingCompleted`, `geoOptIn`. Migración `lib/db/migrations/0001_bright_masque.sql` incluye trigger en `auth.users` que inserta perfil con `username` derivado del email (punto antes de `@`) y RLS básica. Aplicar con `pnpm db:push` o SQL en Supabase.
- **Header**: `components/features/header.tsx` + `header-nav.tsx` (avatar, menú, logout).
- **E2E**: Playwright `tests/e2e/auth.spec.ts`, script `pnpm test:e2e`; escenario signup+confirm por email documentado como skip (sin mock de correo). Variables opcionales en `.env.local.example`.

### OAuth en Supabase (Google y Apple)

1. **Authentication → URL configuration**
   - **Site URL**: mismo valor que `NEXT_PUBLIC_APP_URL` (p. ej. `http://localhost:3000` en local).
   - **Redirect URLs** (allow list): incluir exactamente  
     `{NEXT_PUBLIC_APP_URL}/auth/callback`  
     (y la URL de producción equivalente).

2. **Google** (Authentication → Providers → Google)
   - Crear credencial OAuth en [Google Cloud Console](https://console.cloud.google.com/): tipo _Web application_.
   - **Authorized JavaScript origins**: `NEXT_PUBLIC_APP_URL` (origen, sin path).
   - **Authorized redirect URIs**: `https://<TU_PROJECT_REF>.supabase.co/auth/v1/callback` (lo indica Supabase en la misma pantalla del proveedor).
   - Pegar Client ID y Client Secret en Supabase y activar el proveedor.

3. **Apple** (Authentication → Providers → Apple)
   - Configurar Services ID, clave y equipo en Apple Developer; en la consola de Apple, la **Return URL** del Sign in with Apple debe ser `https://<TU_PROJECT_REF>.supabase.co/auth/v1/callback`.
   - Completar Service ID, clave `.p8`, Key ID y Team ID en Supabase y activar el proveedor.
   - Mismo `NEXT_PUBLIC_APP_URL` y redirect `/auth/callback` que arriba.

4. **Email** (confirmación y recovery): revisar plantillas y que los enlaces apunten al dominio correcto; recovery puede usar `/auth/confirm` según implementación en el proyecto.
