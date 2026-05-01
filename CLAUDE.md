# CLAUDE

## Estado actual

- **Repo / deploy:** [mzuluagat0911/Stickr](https://github.com/mzuluagat0911/Stickr), [docs/deploy.md](docs/deploy.md), CI en `.github/workflows/ci.yml`.
- **Perfil (Fase 2 — base):**
  - **`/profile`**: avatar, nombre, país (nombre + bandera), bio, stats placeholder (álbum %, faltantes, repetidas), trades + rating, mapa estático Mapbox sobre `location_jittered` (vía RPC `get_my_jittered_coordinates`), tarjeta de contacto sin mostrar datos sensibles, enlaces a editar y **privacidad**.
  - **`/profile/edit`**: react-hook-form + Zod (`profileFormSchema` → `ProfileUpdateInput`), displayName (50), bio (200 + contador), `CountryPicker` (~250 países, `i18n-iso-countries` es), ciudad, edición del álbum (lista PR-\*), idiomas en chips, trade preferences (switches), contacto externo (WhatsApp E.164 con país, Telegram, email público + visibilidad por canal + preferido), subida de avatar a Storage bucket **`avatars`**, bloque **GeolocationCapture**.
    Geolocalización: solo **`updateLocationAction`**: jitter **±500 m** (`lib/geo/privacy-jitter.ts`, JSDoc); persistencia **solo** vía RPC `update_user_location_jittered` (coordenadas ya jittered). Nunca se guarda el GPS crudo.
  - **`/privacy`**: álbum (público/registrado/privado) y propuestas (cualquiera / reputación mínima / solo amigos en UI con opción preparada).
  - **Onboarding:** tras datos básicos → **`/onboarding/share-location`** (opcional: explicación + jitter + omitir a `/album`). Middleware permite `/onboarding/share-location` con onboarding completado.
- **Álbum / marcado (Fase 2):**
  - **`/album`**: Server Component carga `sticker_catalog` (edición según `user_profiles.album_edition`) + `user_stickers`, hidrata **`AlbumGrid`** (TanStack Query, updates optimistas + rollback con toast).
  - Tabs: Tournament (FWC 1–15), Specials (FWC 16–83 según catálogo), confederaciones (AFC → UEFA) con equipos colapsables y grillas 5×4 (20 celdas).
  - **`StickerCell`**: ciclo falta → tengo → repetida ×2; en repetida el click abre panel de cantidad; menú contextual; atajos (Tab entre celdas, Space / Shift+Space, 1–9 en repetida).
  - **Server actions:** `markStickerHaveAction`, `markStickerDuplicateAction`, `unmarkStickerAction`, `bulkMarkStickersAction`, `getUserStickersMapAction`.
  - **API** `GET /api/me/album/progress`: totales, `byTeam`, `percent`, cabecera `Cache-Control` con revalidación ~60s; progreso barra en **`AlbumProgressBar`**.
  - **`app/providers.tsx`**: `QueryClientProvider` + DevTools en desarrollo.
- **DB:** migración **`lib/db/migrations/0002_clear_blonde_phantom.sql`**: `contact_methods` y `privacy_settings` (jsonb), check `display_name` ≤ 50, funciones `update_user_location_jittered` y `get_my_jittered_coordinates`. Aplicar con **`pnpm db:push`** (o SQL en Supabase).
- **Supabase Storage:** crear bucket público **`avatars`** y políticas para que cada usuario suba solo bajo `{uid}/...` (si falta, el upload devuelve mensaje guíado).
- **Tests:** `tests/unit/privacy-jitter.test.ts`, `lib/album/progress.test.ts`; E2E `tests/e2e/profile.spec.ts`, `tests/e2e/album.spec.ts` (requiere `E2E_*`). Vitest usa alias `@/` en `vitest.config.ts`.
- **Coordinación:** sin chat realtime; contacto post-intercambio por WhatsApp/Telegram/email según `contact_methods`.

### Próximos pasos (resto Fase 2)

- Políticas RLS explícitas sobre `user_stickers` en Supabase (lectura/escritura por `user_id`).
- Descubrir / matching con `location_jittered` y filtros.
- Mensajes mínimos o notificaciones cuando exista flujo de trade.

### OAuth / Supabase (recordatorio)

`Site URL`, `{APP_URL}/auth/callback`, Google/Apple redirect a `…supabase.co/auth/v1/callback`. Ver `docs/deploy.md`.
