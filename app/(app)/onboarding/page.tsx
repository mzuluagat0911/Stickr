import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/features/onboarding-form";

export default async function OnboardingPage() {
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
    .select("username, album_edition, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    redirect("/album");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col px-4 py-10 md:py-14">
      <div className="mb-8 space-y-3 text-center">
        <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
          Stickr
        </p>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">
            Paso 1 de 2
          </p>
          <div className="bg-muted/80 mx-auto h-1.5 max-w-[200px] overflow-hidden rounded-full">
            <div
              className="bg-primary from-primary via-primary h-full w-1/2 rounded-full shadow-[0_0_16px_-4px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
              aria-hidden
            />
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center pb-10">
        <OnboardingForm
          defaultUsername={(profile?.username as string) ?? ""}
          defaultAlbumEdition={
            (profile?.album_edition as string) ?? "PR-International"
          }
        />
      </div>
    </div>
  );
}
