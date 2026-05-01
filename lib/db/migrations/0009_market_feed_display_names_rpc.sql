-- Fase 3.0: el feed de marketplace necesita `username` de otros usuarios.
-- RLS de user_profiles solo permite SELECT de la fila propia; esta función
-- (SECURITY DEFINER) devuelve solo id + username para usuarios que tienen al
-- menos una publicación activa en market_intentions (no enumeración global).

CREATE OR REPLACE FUNCTION public.get_user_display_names_for_marketplace(
  p_user_ids uuid[]
)
RETURNS TABLE (id uuid, username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.id, up.username::text
  FROM public.user_profiles up
  WHERE
    up.id = ANY (p_user_ids)
    AND EXISTS (
      SELECT 1
      FROM public.market_intentions mi
      WHERE
        mi.user_id = up.id
        AND mi.status = 'active'
    );
$$;

REVOKE ALL ON FUNCTION public.get_user_display_names_for_marketplace(uuid[])
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_display_names_for_marketplace(uuid[])
TO authenticated;
