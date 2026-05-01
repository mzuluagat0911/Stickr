import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";

import { GeolocationCapture } from "@/components/features/geolocation-capture";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OnboardingShareLocationPage() {
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
    .select("onboarding_completed, city, country_code, location_jittered")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  if (profile.location_jittered) {
    redirect("/album");
  }

  const cityLabel = `${profile.city}, ${profile.country_code}`;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col px-4 py-10 md:py-14">
      <div className="mb-8 space-y-3 text-center">
        <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
          Stickr
        </p>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">
            Paso 2 de 2
          </p>
          <div className="bg-muted/80 mx-auto h-1.5 max-w-[200px] overflow-hidden rounded-full">
            <div
              className="via-primary from-primary to-primary/80 h-full w-full rounded-full bg-gradient-to-r"
              aria-hidden
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center pb-10">
        <Card className="border-border/80 shadow-lg shadow-black/5">
          <CardHeader className="space-y-2 pb-2">
            <CardTitle className="text-xl font-semibold tracking-tight">
              Ubicación en el mapa
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Opcional. Ya tenemos tu ciudad; esto solo mejora el mapa y el
              descubrimiento cercano cuando quieras usarlo más adelante.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-2">
            <GeolocationCapture cityLabel={cityLabel} embedded />

            <div className="flex flex-col gap-3 pt-2">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 w-full rounded-full border-dashed"
              >
                <Link href="/album">Ir al álbum sin ubicación GPS</Link>
              </Button>
              <p className="text-muted-foreground px-1 text-center text-xs">
                Siempre puedes activar la ubicación después desde el perfil.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
