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
      className="w-full"
      disabled={disabled}
      onClick={async () => {
        const supabase = createClient();
        const origin = window.location.origin;
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
