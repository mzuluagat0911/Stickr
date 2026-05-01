-- Coleccionistas en la misma ciudad (nombre de usuario, % álbum, repetidas).
-- Misma función que migrations/0005_discover_same_city.sql

CREATE OR REPLACE FUNCTION public.discover_collectors_same_city(
  p_user_id uuid,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  other_user_id uuid,
  username text,
  album_percent numeric,
  duplicate_distinct int,
  duplicates_for_trade int,
  last_active_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'discover_collectors_same_city: no autorizado';
  END IF;

  RETURN QUERY
  WITH me AS (
    SELECT
      up.id,
      trim(up.city)::text AS city_trim,
      up.country_code
    FROM public.user_profiles up
    WHERE up.id = p_user_id
  ),
  candidates AS (
    SELECT
      o.id AS uid,
      o.username AS uname,
      o.last_active_at AS la,
      o.album_edition AS edition
    FROM public.user_profiles o
    INNER JOIN me m ON true
    WHERE o.id <> m.id
      AND trim(o.city)::text <> ''
      AND m.city_trim <> ''
      AND lower(trim(o.city)) = lower(m.city_trim)
      AND o.country_code = m.country_code
      AND o.is_blocked = false
      AND o.onboarding_completed = true
      AND (
        o.privacy_settings IS NULL
        OR (o.privacy_settings->>'album_visibility') IS NULL
        OR (o.privacy_settings->>'album_visibility') <> 'private'
      )
  )
  SELECT
    c.uid AS other_user_id,
    c.uname AS username,
    ROUND(
      (
        100.0
        * COALESCE(agg.coll, 0)::numeric
        / GREATEST(ct.catalog_total, 1)::numeric
      )::numeric,
      1
    ) AS album_percent,
    COALESCE(agg.dup_distinct, 0)::int AS duplicate_distinct,
    COALESCE(agg.dup_trade, 0)::int AS duplicates_for_trade,
    c.la AS last_active_at
  FROM candidates c
  INNER JOIN LATERAL (
    SELECT COUNT(*)::numeric AS catalog_total
    FROM public.sticker_catalog sc
    WHERE sc.album_edition = c.edition
  ) ct ON true
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(
        SUM(CASE WHEN us.status IN ('have', 'duplicate') THEN 1 ELSE 0 END),
        0
      )::int AS coll,
      COALESCE(SUM(CASE WHEN us.status = 'duplicate' THEN 1 ELSE 0 END), 0)::int AS dup_distinct,
      COALESCE(
        SUM(
          CASE
            WHEN us.status = 'duplicate'
              THEN GREATEST(COALESCE(us.duplicate_count, 2) - 1, 0)
            ELSE 0
          END
        ),
        0
      )::int AS dup_trade
    FROM public.user_stickers us
    INNER JOIN public.sticker_catalog sc
      ON sc.id = us.sticker_id AND sc.album_edition = c.edition
    WHERE us.user_id = c.uid
  ) agg ON true
  ORDER BY c.uname ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 1), 1), 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.discover_collectors_same_city(uuid, int)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_collectors_same_city(uuid, int)
  TO service_role;

COMMENT ON FUNCTION public.discover_collectors_same_city(uuid, int) IS
  'Usuarios misma ciudad/país que p_user_id: % colección sobre su album_edition, repetidas y ejemplares de más.';
