# Stickr

## Visión del producto

Stickr conecta coleccionistas del álbum Mundial 2026 para intercambiar, comprar y vender figuritas de forma segura y simple.  
El producto combina matching inteligente, identidad confiable y coordinación local para cerrar tratos con menos fricción.  
La plataforma está pensada para escalar por fases, desde cimientos técnicos sólidos hasta marketplace multi-país.

## Stack técnico completo

- **Framework:** Next.js 14 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Base de datos:** PostgreSQL 15 + PostGIS (vía Supabase)
- **ORM y migraciones:** Drizzle ORM + drizzle-kit
- **Validación:** Zod
- **Formularios:** React Hook Form
- **Backend como plataforma:** Supabase (auth + DB + storage + realtime)
- **Mapas (Fase 2):** Mapbox GL JS
- **Pagos (Fase 3):** Stripe + Mercado Pago
- **Testing:** Vitest + Playwright
- **Package manager:** pnpm

## Estructura de carpetas esperada

- `/app`
- `/components/ui`
- `/components/features`
- `/lib/db`
- `/lib/matching`
- `/lib/payments`
- `/lib/supabase`
- `/lib/utils`
- `/scripts`
- `/tests`
- `/public`

## Convenciones de código

- TypeScript estricto, sin `any`.
- Server Components por defecto; Client Components solo cuando haya interactividad real.
- Server Actions para mutaciones.
- Imports absolutos con alias `@/`.
- Drizzle schema central en `/lib/db/schema.ts`.
- Validación de inputs con Zod en cada Server Action.
- Manejo de errores con tipos `Result<T, E>` (sin excepciones para flujo normal).

## Datos clave del álbum Mundial 2026

- **Total:** 980 figuritas
- **Páginas:** 112
- **Selecciones:** 48
- **Composición por selección:** 1 escudo + 1 foto grupal + 18 jugadores = 20 figuritas
- **Figuritas especiales:** 68 (legendary, gold, etc.)
- **Ediciones regionales:** múltiples (Argentina, Brasil, México, International, etc.)

## Comandos comunes

- `pnpm dev`: levantar entorno local
- `pnpm build`: build de producción
- `pnpm db:push`: aplicar schema a la DB
- `pnpm db:studio`: abrir Drizzle Studio
- `pnpm test`: correr tests
- `pnpm lint`: ejecutar linter

## Variables de entorno requeridas

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto de Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave anónima pública para cliente web.
- `SUPABASE_SERVICE_ROLE_KEY`: clave de rol de servicio para operaciones server-side privilegiadas.
- `DATABASE_URL`: cadena de conexión PostgreSQL para Drizzle y acceso server-side.
- `DIRECT_URL`: conexión directa a PostgreSQL (sin pooler) para migraciones y operaciones administrativas.
- `MAPBOX_ACCESS_TOKEN`: token de Mapbox GL JS para mapas (Fase 2).
- `STRIPE_SECRET_KEY`: clave secreta de Stripe para crear y confirmar pagos (Fase 3).
- `STRIPE_WEBHOOK_SECRET`: secreto para verificar webhooks de Stripe (Fase 3).
- `MERCADOPAGO_ACCESS_TOKEN`: token privado de Mercado Pago para checkout y cobros (Fase 3).
- `MERCADOPAGO_WEBHOOK_SECRET`: secreto/firma para validar notificaciones de Mercado Pago (Fase 3).
- `NEXT_PUBLIC_APP_URL`: URL base pública de la aplicación para callbacks y enlaces.

## Plan en 4 fases

- **Fase 1 - Cimientos:** base técnica fullstack, autenticación, modelo de datos, perfil de usuario y flujo inicial de colección.
- **Fase 2 - Corazón social:** matching, publicaciones, chat/realtime y experiencia geográfica con mapas.
- **Fase 3 - Trade + marketplace + pagos:** ofertas, órdenes, reputación transaccional e integración Stripe/Mercado Pago.
- **Fase 4 - Multi-país y pulido:** localización por edición regional, performance, observabilidad, seguridad y hardening final.

## Estado actual

- Proyecto inicializado con Next.js (App Router) + TypeScript + Tailwind + ESLint + alias `@/`.
- Dependencias de producto y desarrollo instaladas (Drizzle, Supabase, Zod, React Hook Form, Vitest, Playwright, Prettier, Husky, lint-staged).
- `shadcn/ui` inicializado (CLI actual) con componentes base: button, input, label, card, dialog, dropdown-menu, avatar, badge, sonner, form, separator, skeleton y tabs.
- Estructura de carpetas creada con `.gitkeep` en `/lib/*`, `/components/features`, `/scripts`, `/tests/unit` y `/tests/e2e`.
