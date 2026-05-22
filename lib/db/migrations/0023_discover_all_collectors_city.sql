-- Intercambio: listar todos los coleccionistas visibles (no solo misma ciudad).
-- Devuelve ciudad/país y prioriza mismos de tu ciudad en el ranking.

DROP FUNCTION IF EXISTS public.discover_collectors_exchange_ranked (uuid, int);

CREATE OR REPLACE FUNCTION public.discover_collectors_exchange_ranked(
  p_user_id uuid,
  p_limit int DEFAULT 200
)
RETURNS TABLE (
  other_user_id uuid,
  username text,
  city text,
  country_code text,
  is_same_city boolean,
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
      trim(o.city)::text AS ocity,
      o.country_code AS ocountry,
      o.last_active_at AS la,
      o.album_edition AS edition,
      (
        m.city_trim <> ''
        AND trim(o.city)::text <> ''
        AND lower(trim(o.city)) = lower(m.city_trim)
        AND o.country_code = m.country_code
      ) AS same_city
    FROM public.user_profiles o
    INNER JOIN me m ON true
    WHERE o.id <> m.uid
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
      c.ocity AS ccity,
      c.ocountry AS ccountry,
      c.same_city AS csame,
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
    matched.ccity AS city,
    matched.ccountry AS country_code,
    matched.csame AS is_same_city,
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
    matched.csame DESC,
    COALESCE(matched.wo, 0) DESC,
    COALESCE(matched.mtq, 0) DESC,
    COALESCE(matched.md, 0) DESC,
    matched.cla DESC NULLS LAST,
    matched.cname ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 1), 1), 300);
END;
$$;

COMMENT ON FUNCTION public.discover_collectors_exchange_ranked(uuid, int) IS
  'Coleccionistas visibles para intercambio (todos con onboarding); incluye ciudad y prioriza misma ciudad.';

-- DROP + CREATE revoca permisos; hay que restaurarlos (ver 0008).
GRANT EXECUTE ON FUNCTION public.discover_collectors_exchange_ranked (uuid, int)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.discover_collectors_exchange_ranked (uuid, int)
TO service_role;

-- Detalle de cruces: ya no exige misma ciudad, solo perfil visible y misma edición de álbum.
CREATE OR REPLACE FUNCTION public.exchange_overlap_detail (p_peer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid ();
  me_edition text;
  peer public.user_profiles%ROWTYPE;
  gate_ok boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'exchange_overlap_detail: no autenticado';
  END IF;

  IF p_peer_id IS NULL OR p_peer_id = uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_peer');
  END IF;

  SELECT up.album_edition
  INTO me_edition
  FROM public.user_profiles up
  WHERE up.id = uid;

  SELECT *
  INTO peer
  FROM public.user_profiles up
  WHERE up.id = p_peer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'peer_not_found');
  END IF;

  gate_ok :=
    peer.onboarding_completed
    AND NOT peer.is_blocked
    AND (
      peer.privacy_settings IS NULL
      OR (peer.privacy_settings->>'album_visibility') IS NULL
      OR (peer.privacy_settings->>'album_visibility') <> 'private'
    );

  IF NOT gate_ok THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_visible');
  END IF;

  IF me_edition IS DISTINCT FROM peer.album_edition THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'reason',
      'edition_mismatch',
      'yourEdition',
      me_edition,
      'theirEdition',
      peer.album_edition
    );
  END IF;

  RETURN (
    WITH
    ed AS (
      SELECT peer.album_edition::text AS album_edition
    ),
    effective_wants AS (
      SELECT DISTINCT sc.id AS sticker_id
      FROM public.sticker_catalog sc
      CROSS JOIN ed
      LEFT JOIN public.user_stickers us ON us.user_id = uid AND us.sticker_id = sc.id
      WHERE
        sc.album_edition = ed.album_edition
        AND COALESCE(us.status::text, '') NOT IN ('have', 'duplicate')
    ),
    wishlist_ids AS (
      SELECT ew.sticker_id
      FROM public.exchange_wants ew
      CROSS JOIN ed
      INNER JOIN public.sticker_catalog sc
        ON sc.id = ew.sticker_id AND sc.album_edition = ed.album_edition
      WHERE
        ew.user_id = uid
        AND NOT EXISTS (
          SELECT 1
          FROM public.user_stickers us
          WHERE
            us.user_id = uid
            AND us.sticker_id = ew.sticker_id
            AND us.status IN ('have', 'duplicate')
        )
    ),
    want_pool AS (
      SELECT sticker_id
      FROM effective_wants
      UNION
      SELECT sticker_id
      FROM wishlist_ids
    ),
    peer_effective_missing AS (
      SELECT DISTINCT sc.id AS sticker_id
      FROM public.sticker_catalog sc
      CROSS JOIN ed
      LEFT JOIN public.user_stickers us ON us.user_id = p_peer_id AND us.sticker_id = sc.id
      WHERE
        sc.album_edition = ed.album_edition
        AND COALESCE(us.status::text, '') NOT IN ('have', 'duplicate')
    ),
    their_dup_you_need AS (
      SELECT
        sc.id AS sticker_id,
        sc.sticker_number,
        sc.team_code,
        GREATEST(COALESCE(ous.duplicate_count, 2) - 1, 0)::int AS tradable_qty,
        sc.player_name,
        EXISTS (
          SELECT 1
          FROM wishlist_ids w
          WHERE w.sticker_id = sc.id
        ) AS priority_star
      FROM want_pool wp
      INNER JOIN public.user_stickers ous ON ous.user_id = p_peer_id
        AND ous.sticker_id = wp.sticker_id
        AND ous.status = 'duplicate'
      INNER JOIN public.sticker_catalog sc ON sc.id = wp.sticker_id
      CROSS JOIN ed
      WHERE sc.album_edition = ed.album_edition
    ),
    your_dup_they_need AS (
      SELECT
        sc.id AS sticker_id,
        sc.sticker_number,
        sc.team_code,
        GREATEST(COALESCE(vus.duplicate_count, 2) - 1, 0)::int AS tradable_qty,
        sc.player_name,
        EXISTS (
          SELECT 1
          FROM public.exchange_wants pew
          WHERE
            pew.user_id = p_peer_id
            AND pew.sticker_id = sc.id
        ) AS they_prioritized
      FROM peer_effective_missing pm
      INNER JOIN public.user_stickers vus ON vus.user_id = uid
        AND vus.sticker_id = pm.sticker_id
        AND vus.status = 'duplicate'
      INNER JOIN public.sticker_catalog sc ON sc.id = pm.sticker_id
      CROSS JOIN ed
      WHERE sc.album_edition = ed.album_edition
    ),
    their_dup_all AS (
      SELECT
        sc.id AS sticker_id,
        sc.sticker_number,
        sc.team_code,
        GREATEST(COALESCE(ous.duplicate_count, 2) - 1, 0)::int AS tradable_qty,
        sc.player_name
      FROM public.user_stickers ous
      INNER JOIN public.sticker_catalog sc ON sc.id = ous.sticker_id
      CROSS JOIN ed
      WHERE
        ous.user_id = p_peer_id
        AND ous.status = 'duplicate'
        AND sc.album_edition = ed.album_edition
    ),
    their_miss_all AS (
      SELECT
        sc.id AS sticker_id,
        sc.sticker_number,
        sc.team_code,
        sc.player_name
      FROM public.sticker_catalog sc
      CROSS JOIN ed
      LEFT JOIN public.user_stickers us ON us.user_id = p_peer_id AND us.sticker_id = sc.id
      WHERE
        sc.album_edition = ed.album_edition
        AND COALESCE(us.status::text, '') NOT IN ('have', 'duplicate')
    )
    SELECT jsonb_build_object(
      'ok',
      true,
      'albumEdition',
      (SELECT album_edition FROM ed),
      'theirDuplicatesYouNeed',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'stickerId',
              sticker_id,
              'stickerNumber',
              sticker_number,
              'teamCode',
              team_code,
              'tradableQty',
              tradable_qty,
              'playerName',
              player_name,
              'priorityStar',
              priority_star
            )
            ORDER BY sticker_number
          )
          FROM their_dup_you_need
        ),
        '[]'::jsonb
      ),
      'yourDuplicatesTheyNeed',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'stickerId',
              sticker_id,
              'stickerNumber',
              sticker_number,
              'teamCode',
              team_code,
              'tradableQty',
              tradable_qty,
              'playerName',
              player_name,
              'theyPrioritized',
              they_prioritized
            )
            ORDER BY sticker_number
          )
          FROM your_dup_they_need
        ),
        '[]'::jsonb
      ),
      'theirDuplicatesAll',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'stickerId',
              sticker_id,
              'stickerNumber',
              sticker_number,
              'teamCode',
              team_code,
              'tradableQty',
              tradable_qty,
              'playerName',
              player_name
            )
            ORDER BY sticker_number
          )
          FROM their_dup_all
        ),
        '[]'::jsonb
      ),
      'theirMissingAll',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'stickerId',
              sticker_id,
              'stickerNumber',
              sticker_number,
              'teamCode',
              team_code,
              'playerName',
              player_name
            )
            ORDER BY sticker_number
          )
          FROM their_miss_all
        ),
        '[]'::jsonb
      ),
      'counts',
      jsonb_build_object(
        'theirDuplicatesYouNeed',
        (SELECT COUNT(*)::int FROM their_dup_you_need),
        'yourDuplicatesTheyNeed',
        (SELECT COUNT(*)::int FROM your_dup_they_need),
        'theirDuplicatesAll',
        (SELECT COUNT(*)::int FROM their_dup_all),
        'theirMissingAll',
        (SELECT COUNT(*)::int FROM their_miss_all)
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.exchange_overlap_detail (uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.exchange_overlap_detail (uuid)
TO authenticated;

COMMENT ON FUNCTION public.exchange_overlap_detail (uuid) IS
  'Listas de repetidas/faltantes del peer y cruces con auth.uid(); requiere misma edición de álbum.';
