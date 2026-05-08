-- Mejoras de performance para intercambio/mensajes sin cambiar comportamiento:
-- - Discover: acelera filtros por ciudad/pais/visibilidad.
-- - Mensajes: acelera listado por usuario + orden por ultimo mensaje.
-- - Notificaciones: acelera "solicitudes de intercambio" no leidas.

CREATE INDEX IF NOT EXISTS user_profiles_discover_visibility_idx ON public.user_profiles (
  country_code,
  (lower(trim(both FROM city))),
  last_active_at DESC
)
WHERE onboarding_completed = true
  AND is_blocked = false
  AND trim(both FROM city) <> '';

CREATE INDEX IF NOT EXISTS conversations_user_a_last_message_idx ON public.conversations (
  user_a,
  last_message_at DESC
);

CREATE INDEX IF NOT EXISTS conversations_user_b_last_message_idx ON public.conversations (
  user_b,
  last_message_at DESC
);

CREATE INDEX IF NOT EXISTS notifications_trade_proposed_unread_idx ON public.notifications (
  user_id,
  created_at DESC
)
WHERE type = 'trade_proposed'
  AND read_at IS NULL;
