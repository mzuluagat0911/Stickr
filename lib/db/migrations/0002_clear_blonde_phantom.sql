ALTER TABLE "user_profiles" ADD COLUMN "contact_methods" jsonb;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "privacy_settings" jsonb;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_display_name_len" CHECK ("display_name" IS NULL OR char_length("display_name") <= 50);--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.update_user_location_jittered(
  p_longitude double precision,
  p_latitude double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    location_jittered = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
    last_active_at = now()
  WHERE id = auth.uid();
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.update_user_location_jittered(double precision, double precision) TO authenticated;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.get_my_jittered_coordinates()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE
    WHEN u.location_jittered IS NULL THEN NULL
    ELSE jsonb_build_object(
      'lat', ST_Y(u.location_jittered::geometry),
      'lng', ST_X(u.location_jittered::geometry)
    )
  END
  FROM public.user_profiles u
  WHERE u.id = auth.uid();
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.get_my_jittered_coordinates() TO authenticated;