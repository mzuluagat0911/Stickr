-- Permite crear la fila de perfil vía cliente cuando no existía (p. ej. usuario previo al trigger handle_new_user).
-- Sin esto: INSERT desde la app rompe por RLS aunque id = auth.uid().

DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
--> statement-breakpoint
CREATE POLICY "user_profiles_insert_own"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
