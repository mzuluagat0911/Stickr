ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "geo_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  uname text;
  em text;
BEGIN
  em := coalesce(NEW.email, NEW.raw_user_meta_data->>'email', '');
  base := nullif(split_part(em, '@', 1), '');
  IF base IS NULL THEN
    base := 'usuario';
  END IF;
  base := left(regexp_replace(base, '[^a-zA-Z0-9_]', '_', 'g'), 24);
  IF base = '' THEN
    base := 'usuario';
  END IF;
  uname := base || '_' || substr(replace(NEW.id::text, '-', ''), 1, 8);

  INSERT INTO public.user_profiles (
    id,
    username,
    display_name,
    country_code,
    city,
    album_edition,
    languages,
    onboarding_completed,
    geo_opt_in
  ) VALUES (
    NEW.id,
    uname,
    coalesce(
      nullif(NEW.raw_user_meta_data->>'full_name', ''),
      nullif(NEW.raw_user_meta_data->>'name', ''),
      nullif(NEW.raw_user_meta_data->>'display_name', ''),
      base
    ),
    'XX',
    'Pendiente',
    'PR-International',
    ARRAY['es']::text[],
    false,
    false
  );
  RETURN NEW;
END;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();--> statement-breakpoint
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;--> statement-breakpoint
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;--> statement-breakpoint
CREATE POLICY "user_profiles_select_own"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());--> statement-breakpoint
CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
