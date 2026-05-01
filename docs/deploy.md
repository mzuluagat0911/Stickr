# Deploy en Vercel (Stickr)

Guía manual para conectar el repo de GitHub, variables de entorno y dominios.

## 1. Importar el proyecto en Vercel

1. Entrá a [vercel.com](https://vercel.com) con tu cuenta.
2. **Add New… → Project → Import** el repositorio **GitHub** `mzuluagat0911/Stickr` (o el que uses).
3. Framework: **Next.js** (detección automática).
4. **Root directory**: raíz del repo (por defecto).
5. Build: `pnpm build` / install: `pnpm install` (Vercel suele detectar pnpm por el lockfile).

Cuando pregunte por variables de entorno, configurá las del siguiente apartado antes del primer deploy o volvé a desplegar después de guardarlas.

## 2. Variables de entorno

Replicá las claves de [`.env.local.example`](../.env.local.example) en **Vercel → Project → Settings → Environment Variables**.

| Variable                        | Entornos                                                                                                                                                                              | Notas                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Production, Preview, Development                                                                                                                                                      | URL del proyecto Supabase (`https://<ref>.supabase.co`).                                                                                                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development                                                                                                                                                      | Clave **anon** (pública, limitada por RLS).                                                                                                                                  |
| `NEXT_PUBLIC_APP_URL`           | **Production**: dominio final (`https://tu-dominio.com`). **Preview**: podés dejarla vacía para usar el host del deploy (`*.vercel.app`) o definir una URL fija si unificás previews. | Usada en callbacks de email/OAuth y redirecciones canónicas en producción.                                                                                                   |
| `DATABASE_URL`                  | Solo si algún código server importa `lib/db` en runtime                                                                                                                               | Hoy los seeds usan DB local/CI; la app Next no importa `lib/db` en rutas. Si más adelante lo usás en API routes, agregala aquí (connection string de Supabase **Database**). |
| `SUPABASE_SERVICE_ROLE_KEY`     | Opcional; **nunca** en cliente                                                                                                                                                        | Solo para scripts admin o rutas muy acotadas; no hace falta en Vercel si no ejecutás ese código en el deploy.                                                                |
| `NEXT_PUBLIC_MAPBOX_TOKEN`      | Cuando integres mapas                                                                                                                                                                 | Hasta entonces puede omitirse o un placeholder.                                                                                                                              |

**Production:** `NEXT_PUBLIC_APP_URL` debe coincidir con el dominio que ve el usuario (dominio custom o `https://<proyecto>.vercel.app`).

**Preview:** Si no definís `NEXT_PUBLIC_APP_URL`, OAuth y flujos que usan el origen del navegador seguirán usando la URL del preview (ej. `https://stickr-xxx.vercel.app`). En **Supabase → Authentication → URL configuration** tenés que agregar cada **Redirect URL** preview que uses (p. ej. `https://<deploy>.vercel.app/auth/callback`) o trabajar solo con producción para OAuth.

## 3. Dominios (preview y production)

1. **Vercel → Project → Settings → Domains**.
2. **Production**: asociá tu dominio custom y marcá **Production**; configurá DNS según las instrucciones de Vercel.
3. **Preview**: cada push a PR/branch genera una URL `*.vercel.app`; no requiere pasos extra salvo DNS wildcards si usás dominio propio para previews.

Actualizá en **Supabase**:

- **Site URL**: la URL principal de producción (la misma base que `NEXT_PUBLIC_APP_URL` en Production).
- **Redirect URLs**: incluí al menos:
  - `https://<tu-dominio-prod>/auth/callback`
  - `http://localhost:3000/auth/callback` (desarrollo local)
  - Cada URL de preview si probás OAuth en PRs (`https://*.vercel.app/auth/callback` **no** suele estar permitido como comodín; hay que listar URLs o usar solo prod).

## 4. Tras el primer deploy

- Probar `GET /api/health` → `{ "status": "ok", "commit": "...", "timestamp": "..." }` (en Vercel `commit` usa `VERCEL_GIT_COMMIT_SHA`).
- Login / signup / OAuth según lo configurado en Supabase.
- Revisá que **GitHub Actions** (workflow `ci.yml`) esté en verde en los PRs.

## 5. Qué no subir nunca

- `.env.local` está en `.gitignore`; las claves reales solo en Vercel y en tu máquina.
- No commitear **service_role** ni contraseñas de base en el repo.
