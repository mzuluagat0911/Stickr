-- Intercambio: WhatsApp en tarjetas (ejecutar en Supabase SQL Editor → Run)

CREATE OR REPLACE FUNCTION public.get_discover_peers_contact (p_peer_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid ();
  out jsonb := '[]'::jsonb;
  pid uuid;
  cm jsonb;
  wa jsonb;
  vis text;
  num text;
  visible boolean;
  row jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'get_discover_peers_contact: no autenticado';
  END IF;

  IF p_peer_ids IS NULL OR cardinality(p_peer_ids) = 0 THEN
    RETURN out;
  END IF;

  FOREACH pid IN ARRAY p_peer_ids LOOP
    IF pid IS NULL OR pid = uid THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.user_profiles o
      WHERE
        o.id = pid
        AND o.is_blocked = false
        AND o.onboarding_completed = true
        AND (
          o.privacy_settings IS NULL
          OR (o.privacy_settings->>'album_visibility') IS NULL
          OR (o.privacy_settings->>'album_visibility') <> 'private'
        )
    )
    INTO visible;

    IF NOT visible THEN
      CONTINUE;
    END IF;

    SELECT up.contact_methods
    INTO cm
    FROM public.user_profiles up
    WHERE up.id = pid;

    row := jsonb_build_object('peer_id', pid);

    IF cm IS NULL OR cm = 'null'::jsonb OR jsonb_typeof (cm) <> 'object' THEN
      out := out || jsonb_build_array(row);
      CONTINUE;
    END IF;

    wa := cm -> 'whatsapp';

    IF wa IS NOT NULL AND wa <> 'null'::jsonb AND jsonb_typeof (wa) = 'object' THEN
      vis := COALESCE(wa ->> 'visibility', 'post_trade');
      num := trim(COALESCE(wa ->> 'number', ''));

      IF vis <> 'never' AND num <> '' THEN
        row := row || jsonb_build_object('whatsapp', num);
      END IF;
    END IF;

    out := out || jsonb_build_array(row);
  END LOOP;

  RETURN out;
END;
$$;

REVOKE ALL ON FUNCTION public.get_discover_peers_contact (uuid[])
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_discover_peers_contact (uuid[])
TO authenticated;
