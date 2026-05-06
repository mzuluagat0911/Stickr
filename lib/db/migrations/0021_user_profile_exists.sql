-- La tabla user_profiles solo permite SELECT de la fila propia (RLS). Las server
-- actions que necesitan comprobar si otro usuario existe (p. ej. abrir chat) deben
-- usar esta función en lugar de SELECT directo.

CREATE OR REPLACE FUNCTION public.user_profile_exists (p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.user_profile_exists (uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_profile_exists (uuid)
TO authenticated;

COMMENT ON FUNCTION public.user_profile_exists (uuid) IS
  'TRUE si existe user_profiles.id = p_user_id; bypass RLS solo para existencia.';
