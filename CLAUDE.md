# CLAUDE

## Estado actual

- Next.js (App Router) + TypeScript + Tailwind + ESLint + alias `@/`. Ver `AGENTS.md` por cambios de la versión de Next.
- Drizzle + Supabase (cliente anon en browser; cookies con `@supabase/ssr` en server y middleware). **No** usar `SUPABASE_SERVICE_ROLE_KEY` en cliente; solo en server actions / route handlers donde sea imprescindible (el script `scripts/seed-test-users.ts` la usa para crear usuarios de desarrollo).
- **`lib/supabase/`**: `server.ts` (`createServerClient`), `browser.ts` (`createBrowserClient`), `middleware.ts` (`updateSession` con `getAll`/`setAll`).
- **`middleware.ts` (raíz)**: refresca sesión; rutas que exigen sesión (`/album`, `/onboarding`, `/discover`, `/messages`, `/marketplace`, `/profile` y subrutas); sin usuario → `/login`. Onboarding incompleto → redirección a `/onboarding` desde las secciones de la app (no desde la propia onboarding). Rutas de auth con sesión → `/album` u `/onboarding`.
- **Shell autenticado** (`app/(app)/layout.tsx`): **Header** global, **sidebar** en desktop y **barra inferior** en mobile (`AppSidebar`, `AppBottomNav`), área principal `max-w-5xl` centrada. Navegación definida en `lib/navigation/app-nav.ts` (Lucide: BookOpen, Compass, MessageCircle, ShoppingBag, User).
- **Tema**: `next-themes` en `app/providers.tsx` con `storageKey: stickr-theme`. **ThemeToggle** en el header.
- **Páginas placeholder**: `/album` (Mi Álbum + CTA deshabilitado), `/discover`, `/messages`, `/marketplace` con `EmptyState`; `/profile` lee `user_profiles` del usuario; `/profile/edit` placeholder.
- **UX**: `app/(app)/loading.tsx` (skeletons), `app/(app)/error.tsx`. Componente reutilizable `components/ui/empty-state.tsx`.
- **Landing** (`app/page.tsx`): hero con CTAs Login / Signup; si hay sesión redirige a `/album` u `/onboarding`.
- **Auth**: login/signup/OAuth/callback/confirm/onboarding y acciones en `app/actions/auth.ts` con Zod y Sonner.
- **`user_profiles`**: trigger en `auth.users` (migración `lib/db/migrations/0001_*`) y RLS. `pnpm db:push` pendiente según tu entorno.
- **Seed desarrollo**: `pnpm seed:test-users` — 5 usuarios con perfiles y `location_jittered` (CABA, CDMX, Bogotá, Madrid, São Paulo). Requiere `SUPABASE_SERVICE_ROLE_KEY` + `DATABASE_URL` + PostGIS.
- **E2E**: Playwright `tests/e2e/auth.spec.ts`, `pnpm test:e2e`.

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
