# CLAUDE

## Estado actual

- Proyecto inicializado con Next.js (App Router) + TypeScript + Tailwind + ESLint + alias `@/`.
- Dependencias base y de desarrollo instaladas (Drizzle, Supabase, Zod, React Hook Form, testing, formatting, husky/lint-staged).
- `shadcn/ui` inicializado con CLI actual y componentes UI iniciales agregados.
- Configurados `.prettierrc`, `.env.local.example`, `husky` y `lint-staged`.
- Estructura de carpetas esperada creada con `.gitkeep`.
- Repositorio git inicializado con commit base: `chore: initial setup`.
- Verificación de arranque completada con `pnpm dev` en `http://localhost:3000`.
- Schema Drizzle inicial con tablas de perfiles, catálogo, colección, chat, trades, marketplace, reseñas, reportes y notificaciones; migración en `lib/db/migrations/` y cliente en `lib/db/index.ts` (postgres-js / `postgres`).
- `pnpm db:push` pendiente en tu máquina: requiere `DATABASE_URL` en `.env.local` (no se ejecutó push aquí por falta de credenciales).
