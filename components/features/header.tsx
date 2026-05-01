import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";

import { HeaderNav } from "@/components/features/header-nav";

export async function Header() {
  if (!hasPublicSupabaseConfig()) {
    return <HeaderNav user={null} profile={null} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <HeaderNav user={null} profile={null} />;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <HeaderNav
      user={{ id: user.id, email: user.email }}
      profile={
        profile
          ? {
              username: profile.username as string,
              avatar_url: profile.avatar_url as string | null,
            }
          : null
      }
    />
  );
}
