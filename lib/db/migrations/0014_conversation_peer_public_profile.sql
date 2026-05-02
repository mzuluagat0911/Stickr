-- Perfil público mínimo del otro participante en un hilo de mensajes (RLS de
-- user_profiles solo permite SELECT de la fila propia).

CREATE OR REPLACE FUNCTION public.get_conversation_peer_public_profile (
  p_conversation_id uuid
)
RETURNS TABLE (
  username text,
  city text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid ();
  peer uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'get_conversation_peer_public_profile: no autenticado';
  END IF;

  SELECT CASE WHEN c.user_a = uid THEN c.user_b ELSE c.user_a END
  INTO peer
  FROM public.conversations c
  WHERE
    c.id = p_conversation_id
    AND (c.user_a = uid OR c.user_b = uid);

  IF peer IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    trim(up.username)::text AS username,
    NULLIF(trim(up.city), '')::text AS city
  FROM public.user_profiles up
  WHERE up.id = peer;
END;
$$;

REVOKE ALL ON FUNCTION public.get_conversation_peer_public_profile (uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_conversation_peer_public_profile (uuid)
TO authenticated;

COMMENT ON FUNCTION public.get_conversation_peer_public_profile (uuid) IS
  'Username y ciudad del peer si auth.uid() participa en la conversación; bypass RLS acotado.';
