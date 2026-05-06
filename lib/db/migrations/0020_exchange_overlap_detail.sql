-- Detalle para coordinar intercambios: repetidas/faltantes del peer visibles solo si
-- cumple las mismas reglas que discover (misma ciudad/país, álbum no privado, etc.)
-- y ambos comparten album_edition.

CREATE OR REPLACE FUNCTION public.exchange_overlap_detail (p_peer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid ();
  me_city text;
  me_country text;
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

  SELECT trim(both FROM up.city), up.country_code, up.album_edition
  INTO me_city, me_country, me_edition
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
    AND trim(both FROM peer.city) <> ''
    AND trim(both FROM me_city) <> ''
    AND lower(trim(both FROM peer.city)) = lower(trim(both FROM me_city))
    AND peer.country_code = me_country
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
  'Listas de repetidas/faltantes del peer y cruces con auth.uid(); requiere misma ciudad y album_edition.';
