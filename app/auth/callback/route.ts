import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/login?error=auth");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirect("/login?error=auth");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login?error=auth");
  }

  const meta = user.user_metadata as Record<string, string | undefined>;
  await supabase
    .from("user_profiles")
    .update({
      avatar_url: meta.avatar_url ?? meta.picture ?? null,
      display_name:
        meta.full_name ??
        meta.name ??
        meta.display_name ??
        meta.email?.split("@")[0],
      last_active_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const nextPath = profile?.onboarding_completed ? "/album" : "/onboarding";
  return redirect(nextPath);
}
