import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";
import { buildProfileFormDefaults } from "@/lib/profile-form-defaults";

import { ProfileEditForm } from "@/components/features/profile-edit-form";
import { Button } from "@/components/ui/button";

export default async function ProfileEditPage() {
  if (!hasPublicSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "display_name, bio, country_code, city, album_edition, languages, trade_preferences, contact_methods, avatar_url, onboarding_completed",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.onboarding_completed) {
    redirect("/onboarding");
  }

  const defaults = buildProfileFormDefaults(
    {
      display_name: profile.display_name as string | null,
      bio: profile.bio as string | null,
      country_code: profile.country_code as string,
      city: profile.city as string,
      album_edition: profile.album_edition as string,
      languages: profile.languages as string[] | null,
      trade_preferences: profile.trade_preferences as Record<
        string,
        boolean
      > | null,
      contact_methods: profile.contact_methods as
        | import("@/lib/types/profile").ContactMethods
        | null,
    },
    user.email ?? "",
  );

  const cityLabel = `${profile.city}, ${profile.country_code}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar perfil
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Nombre, bio, idiomas, contacto externo y ubicación con privacidad.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/profile">Volver</Link>
        </Button>
      </div>
      <ProfileEditForm
        defaultValues={defaults}
        cityLabel={cityLabel}
        avatarUrl={(profile.avatar_url as string | null) ?? null}
      />
    </div>
  );
}
