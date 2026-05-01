import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
      <Card>
        <CardHeader>
          <CardTitle>Compartir ubicación (opcional)</CardTitle>
          <CardDescription>
            Para mostrarte coleccionistas y un mapa más útil, podés compartir tu
            ubicación. Nunca guardamos el punto exacto del GPS: aplicamos un
            desplazamiento aleatorio de <strong>±500 metros</strong> antes de
            guardar. Si preferís no compartirla, seguimos usando solo tu ciudad
            declarada.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <GeolocationCapture cityLabel={cityLabel} />
          <Button variant="outline" asChild className="w-full">
            <Link href="/album">Continuar sin ubicación precisa</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
