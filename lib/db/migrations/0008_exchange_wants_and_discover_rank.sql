-- Prioridades para intercambio (lista explícita) + ranking por coincidencia
-- con coleccionistas de la misma ciudad (mis faltantes/prioridades vs sus repetidas).

CREATE TABLE IF NOT EXISTS public.exchange_wants (
  user_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  sticker_id text NOT NULL REFERENCES public.sticker_catalog (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sticker_id)
);

CREATE INDEX IF NOT EXISTS exchange_wants_user_id_idx ON public.exchange_wants (user_id);
CREATE INDEX IF NOT EXISTS exchange_wants_sticker_id_idx ON public.exchange_wants (sticker_id);

ALTER TABLE public.exchange_wants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exchange_wants_select_own ON public.exchange_wants;
CREATE POLICY exchange_wants_select_own ON public.exchange_wants
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS exchange_wants_insert_own ON public.exchange_wants;
CREATE POLICY exchange_wants_insert_own ON public.exchange_wants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS exchange_wants_delete_own ON public.exchange_wants;
CREATE POLICY exchange_wants_delete_own ON public.exchange_wants
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.exchange_wants IS
  'Figuritas que el usuario prioriza para conseguir en intercambio (editable desde el álbum).';

CREATE OR REPLACE FUNCTION public.discover_collectors_exchange_ranked(
  p_user_id uuid,
  p_limit int DEFAULT 120
)
RETURNS TABLE (
  other_user_id uuid,
  username text,
  album_percent numeric,
  duplicate_distinct int,
  duplicates_for_trade int,
  last_active_at timestamptz,
  match_distinct_help int,
  match_tradable_qty int,
  wishlist_overlap_distinct int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'discover_collectors_exchange_ranked: no autorizado';
  END IF;

  RETURN QUERY
  WITH me AS (
    SELECT
      up.id AS uid,
      trim(up.city)::text AS city_trim,
      up.country_code,
      up.album_edition
    FROM public.user_profiles up
    WHERE up.id = p_user_id
  ),
  effective_wants AS (
    SELECT DISTINCT sc.id AS sticker_id
    FROM public.sticker_catalog sc
    INNER JOIN me m ON sc.album_edition = m.album_edition
    LEFT JOIN public.user_stickers us ON us.user_id = m.uid AND us.sticker_id = sc.id
    WHERE COALESCE(us.status::text, '') NOT IN ('have', 'duplicate')
  ),
  wishlist_ids AS (
    SELECT ew.sticker_id
    FROM public.exchange_wants ew
    INNER JOIN me m ON ew.user_id = m.uid
    INNER JOIN public.sticker_catalog sc
      ON sc.id = ew.sticker_id AND sc.album_edition = m.album_edition
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_stickers us
      WHERE us.user_id = m.uid
        AND us.sticker_id = ew.sticker_id
        AND us.status IN ('have', 'duplicate')
    )
  ),
  want_pool AS (
    SELECT sticker_id FROM effective_wants
    UNION
    SELECT sticker_id FROM wishlist_ids
  ),
  candidates AS (
    SELECT
      o.id AS uid,
      o.username AS uname,
      o.last_active_at AS la,
      o.album_edition AS edition
    FROM public.user_profiles o
    INNER JOIN me m ON true
    WHERE o.id <> m.uid
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
  ),
  matched AS (
    SELECT
      c.uid AS cid,
      c.uname AS cname,
      c.la AS cla,
      c.edition AS cedition,
      agg.coll AS coll,
      agg.dup_distinct AS dup_distinct,
      agg.dup_trade AS dup_trade,
      mt.match_distinct_help AS md,
      mt.match_tradable_qty AS mtq,
      mt.wishlist_overlap_distinct AS wo
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
    LEFT JOIN LATERAL (
      SELECT
        COUNT(DISTINCT jp.sticker_id)::int AS match_distinct_help,
        COALESCE(
          SUM(GREATEST(COALESCE(ous.duplicate_count, 2) - 1, 0))::bigint,
          0
        )::int AS match_tradable_qty,
        COUNT(DISTINCT CASE WHEN wl.sticker_id IS NOT NULL THEN jp.sticker_id END)::int
          AS wishlist_overlap_distinct
      FROM want_pool jp
      INNER JOIN public.user_stickers ous
        ON ous.user_id = c.uid
        AND ous.sticker_id = jp.sticker_id
        AND ous.status = 'duplicate'
      LEFT JOIN wishlist_ids wl ON wl.sticker_id = jp.sticker_id
    ) mt ON true
    WHERE ct.catalog_total >= 1
  )
  SELECT
    matched.cid AS other_user_id,
    matched.cname AS username,
    ROUND(
      (
        100.0
        * COALESCE(matched.coll, 0)::numeric
        / GREATEST(
          (SELECT COUNT(*)::numeric FROM public.sticker_catalog sc
           WHERE sc.album_edition = matched.cedition),
          1
        )
      )::numeric,
      1
    ) AS album_percent,
    COALESCE(matched.dup_distinct, 0)::int AS duplicate_distinct,
    COALESCE(matched.dup_trade, 0)::int AS duplicates_for_trade,
    matched.cla AS last_active_at,
    COALESCE(matched.md, 0)::int AS match_distinct_help,
    COALESCE(matched.mtq, 0)::int AS match_tradable_qty,
    COALESCE(matched.wo, 0)::int AS wishlist_overlap_distinct
  FROM matched
  ORDER BY
    COALESCE(matched.wo, 0) DESC,
    COALESCE(matched.mtq, 0) DESC,
    COALESCE(matched.md, 0) DESC,
    matched.cla DESC NULLS LAST,
    matched.cname ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 1), 1), 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.discover_collectors_exchange_ranked(uuid, int)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_collectors_exchange_ranked(uuid, int)
  TO service_role;

COMMENT ON FUNCTION public.discover_collectors_exchange_ranked(uuid, int) IS
  'Coleccionistas misma ciudad; ordenados por cantidad que pueden aportarte (repetidas que te faltan o priorizaste).';
