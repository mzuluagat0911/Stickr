import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/features/onboarding-form";

export default async function OnboardingPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
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
    <div className="flex justify-center">
      <OnboardingForm
        defaultUsername={(profile?.username as string) ?? ""}
        defaultAlbumEdition={
          (profile?.album_edition as string) ?? "PR-International"
        }
      />
    </div>
  );
}
