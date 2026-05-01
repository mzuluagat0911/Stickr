import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { PrivacySettings } from "@/lib/types/profile";

import { PrivacySettingsForm } from "@/components/features/privacy-settings-form";
import { Button } from "@/components/ui/button";

export default async function PrivacyPage() {
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
    .select("privacy_settings, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const initial = profile.privacy_settings as PrivacySettings | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Privacidad</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Controlá visibilidad y quién puede proponerte intercambios.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/profile">Volver al perfil</Link>
        </Button>
      </div>
      <PrivacySettingsForm initial={initial} />
    </div>
  );
}
