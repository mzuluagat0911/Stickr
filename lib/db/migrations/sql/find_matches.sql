-- Motor de matching: coleccionistas cercanos con figuritas complementarias.
-- PostGIS: distance_km vía ST_Distance(geography); filtro ST_DWithin usa el índice GIST en location_jittered.
-- Llamar solo con JWT de usuario (p_user_id = auth.uid()) o desde rol con privilegios.

CREATE OR REPLACE FUNCTION public.find_matches(
  p_user_id uuid,
  p_max_distance_km int DEFAULT 50,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  other_user_id uuid,
  username text,
  distance_km numeric,
  they_have_i_need int,
  i_have_they_need int,
  match_score numeric,
  last_active_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'find_matches: no autorizado';
  END IF;

  RETURN QUERY
  WITH me AS (
    SELECT
      up.id,
      up.location_jittered AS loc,
      up.album_edition
    FROM public.user_profiles up
    WHERE up.id = p_user_id
  ),
  my_edition_stickers AS (
    SELECT sc.id AS sticker_id
    FROM public.sticker_catalog sc
    INNER JOIN me ON sc.album_edition = me.album_edition
  ),
  my_needed AS (
    SELECT mes.sticker_id
    FROM my_edition_stickers mes
    LEFT JOIN public.user_stickers us
      ON us.user_id = p_user_id AND us.sticker_id = mes.sticker_id
    WHERE us.sticker_id IS NULL OR us.status = 'missing'
  ),
  my_dupe_tradeable AS (
    SELECT us.sticker_id
    FROM public.user_stickers us
    INNER JOIN my_edition_stickers mes ON mes.sticker_id = us.sticker_id
    WHERE us.user_id = p_user_id
      AND us.status = 'duplicate'
      AND us.duplicate_count >= 2
  ),
  -- Candidatos geo primero (aprovecha GiST); distancia en metros → km.
  geo_candidates AS (
    SELECT
      up.id AS other_user_id,
      up.username,
      up.rating_avg,
      up.trades_completed,
      up.last_active_at,
      (ST_Distance(me.loc, up.location_jittered, false) / 1000.0)::numeric AS distance_km
    FROM public.user_profiles up
    CROSS JOIN me
    WHERE up.id <> p_user_id
      AND up.is_blocked = false
      AND up.location_jittered IS NOT NULL
      AND me.loc IS NOT NULL
      AND ST_DWithin(
        me.loc,
        up.location_jittered,
        (GREATEST(p_max_distance_km, 1))::double precision * 1000.0,
        false
      )
  ),
  they_have AS (
    SELECT gc.other_user_id, COUNT(*)::int AS cnt
    FROM geo_candidates gc
    INNER JOIN public.user_stickers ub ON ub.user_id = gc.other_user_id
    INNER JOIN my_needed mn ON mn.sticker_id = ub.sticker_id
    INNER JOIN my_edition_stickers mes ON mes.sticker_id = ub.sticker_id
    WHERE ub.status = 'duplicate'
      AND ub.duplicate_count >= 2
    GROUP BY gc.other_user_id
  ),
  i_have AS (
    SELECT gc.other_user_id, COUNT(*)::int AS cnt
    FROM geo_candidates gc
    CROSS JOIN my_dupe_tradeable mdt
    LEFT JOIN public.user_stickers ub
      ON ub.user_id = gc.other_user_id AND ub.sticker_id = mdt.sticker_id
    WHERE ub.sticker_id IS NULL OR ub.status = 'missing'
    GROUP BY gc.other_user_id
  ),
  scored AS (
    SELECT
      gc.other_user_id,
      gc.username,
      gc.distance_km,
      gc.last_active_at,
      COALESCE(th.cnt, 0) AS v_they_have,
      COALESCE(ih.cnt, 0) AS v_i_have,
      (
        1.0 * COALESCE(th.cnt, 0)
        + 1.0 * COALESCE(ih.cnt, 0)
        + 5.0 * CASE
          WHEN COALESCE(th.cnt, 0) >= 1 AND COALESCE(ih.cnt, 0) >= 1 THEN 1
          ELSE 0
        END
        - 0.05 * gc.distance_km
        + 0.5 * COALESCE(gc.rating_avg, 0)::numeric
          * LN((1 + GREATEST(0, gc.trades_completed))::numeric)
        + 0.3 * (
          1.0 / NULLIF(
            1.0 + GREATEST(
              0::numeric,
              (EXTRACT(EPOCH FROM (now() - gc.last_active_at)) / 86400.0)::numeric
            ),
            0
          )
        )
      )::numeric AS raw_score
    FROM geo_candidates gc
    LEFT JOIN they_have th ON th.other_user_id = gc.other_user_id
    LEFT JOIN i_have ih ON ih.other_user_id = gc.other_user_id
    WHERE COALESCE(th.cnt, 0) + COALESCE(ih.cnt, 0) >= 1
  )
  SELECT
    s.other_user_id,
    s.username,
    s.distance_km,
    s.v_they_have,
    s.v_i_have,
    s.raw_score,
    s.last_active_at
  FROM scored s
  WHERE s.raw_score > 0
  ORDER BY s.raw_score DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
END;
$$;--> statement-breakpoint

GRANT EXECUTE ON FUNCTION public.find_matches(uuid, int, int) TO authenticated;--> statement-breakpoint

GRANT EXECUTE ON FUNCTION public.find_matches(uuid, int, int) TO service_role;--> statement-breakpoint

COMMENT ON FUNCTION public.find_matches(uuid, int, int) IS
  'Matchmaking por distancia y figuritas complementarias (misma album_edition que p_user_id).';
