"use client";

import { toast } from "sonner";

import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function OAuthProviderButton({
  provider,
  label,
  disabled,
}: {
  provider: "google" | "apple";
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
        const origin = appBase ?? window.location.origin;
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
