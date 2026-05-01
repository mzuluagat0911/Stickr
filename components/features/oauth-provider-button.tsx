"use client";

import { toast } from "sonner";

import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function OAuthProviderButton({
  provider,
  label,
  disabled,
}: {
  provider: "google";
  label: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="border-border/90 h-11 w-full rounded-full"
      disabled={disabled}
      onClick={async () => {
        const supabase = createClient();
        const appBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
        const badLocal =
          appBase?.includes("localhost") || appBase?.includes("127.0.0.1");
        const origin = appBase && !badLocal ? appBase : window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${origin}/auth/callback`,
          },
        });
        if (error) toast.error(error.message);
      }}
    >
      {label}
    </Button>
  );
}
