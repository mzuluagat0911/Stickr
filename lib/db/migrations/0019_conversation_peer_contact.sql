-- Datos de contacto del otro participante en un hilo, respetando visibilidad en
-- contact_methods (always / post_trade / never). post_trade se libera cuando
-- ambos ya enviaron al menos un mensaje en el hilo o cuando hay un market_deal
-- completed para esa conversación.

CREATE OR REPLACE FUNCTION public.get_conversation_peer_contact (
  p_conversation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid ();
  peer uuid;
  cm jsonb;
  unlocked boolean;
  result jsonb := '{}'::jsonb;
  wa jsonb;
  tg jsonb;
  em jsonb;
  vis text;
  pref text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'get_conversation_peer_contact: no autenticado';
  END IF;

  SELECT CASE WHEN c.user_a = uid THEN c.user_b ELSE c.user_a END
  INTO peer
  FROM public.conversations c
  WHERE
    c.id = p_conversation_id
    AND (c.user_a = uid OR c.user_b = uid);

  IF peer IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT up.contact_methods
  INTO cm
  FROM public.user_profiles up
  WHERE up.id = peer;

  IF cm IS NULL OR cm = 'null'::jsonb OR jsonb_typeof (cm) <> 'object' THEN
    RETURN NULL;
  END IF;

  SELECT (
    COALESCE(
      (
        SELECT count(DISTINCT m.sender_id)::int
        FROM public.messages m
        WHERE
          m.conversation_id = p_conversation_id
      ),
      0
    ) >= 2
    OR EXISTS (
      SELECT 1
      FROM public.market_deals md
      WHERE
        md.conversation_id = p_conversation_id
        AND md.status = 'completed'
    )
  )
  INTO unlocked;

  wa := cm -> 'whatsapp';

  IF wa IS NOT NULL AND wa <> 'null'::jsonb AND jsonb_typeof (wa) = 'object' THEN
    vis := COALESCE(wa ->> 'visibility', 'post_trade');

    IF vis = 'never' THEN
      NULL;
    ELSIF vis = 'always' OR (vis = 'post_trade' AND unlocked) THEN
      IF
        wa ->> 'number' IS NOT NULL
        AND trim(wa ->> 'number') <> ''
      THEN
        result :=
          result || jsonb_build_object('whatsapp', trim(wa ->> 'number'));
      END IF;
    END IF;
  END IF;

  tg := cm -> 'telegram';

  IF tg IS NOT NULL AND tg <> 'null'::jsonb AND jsonb_typeof (tg) = 'object' THEN
    vis := COALESCE(tg ->> 'visibility', 'post_trade');

    IF vis = 'never' THEN
      NULL;
    ELSIF vis = 'always' OR (vis = 'post_trade' AND unlocked) THEN
      IF
        tg ->> 'username' IS NOT NULL
        AND trim(tg ->> 'username') <> ''
      THEN
        result :=
          result || jsonb_build_object(
            'telegram',
            trim(both '@' FROM trim(tg ->> 'username'))
          );
      END IF;
    END IF;
  END IF;

  em := cm -> 'email_public';

  IF em IS NOT NULL AND em <> 'null'::jsonb AND jsonb_typeof (em) = 'object' THEN
    vis := COALESCE(em ->> 'visibility', 'post_trade');

    IF vis = 'never' THEN
      NULL;
    ELSIF vis = 'always' OR (vis = 'post_trade' AND unlocked) THEN
      IF
        em ->> 'address' IS NOT NULL
        AND trim(em ->> 'address') <> ''
      THEN
        result :=
          result || jsonb_build_object(
            'email',
            lower(trim(em ->> 'address'))
          );
      END IF;
    END IF;
  END IF;

  pref := cm ->> 'preferred';

  IF pref IN ('whatsapp', 'telegram', 'email') THEN
    IF
      (pref = 'whatsapp' AND result ? 'whatsapp')
      OR (pref = 'telegram' AND result ? 'telegram')
      OR (pref = 'email' AND result ? 'email')
    THEN
      result := result || jsonb_build_object('preferred', pref);
    END IF;
  END IF;

  IF result = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_conversation_peer_contact (uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_conversation_peer_contact (uuid)
TO authenticated;

COMMENT ON FUNCTION public.get_conversation_peer_contact (uuid) IS
  'Contacto del peer en una conversación donde participa auth.uid(); respeta visibilidad y desbloqueo post_trade.';
