import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  if (hasPublicSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      redirect(
        profile?.onboarding_completed === true ? "/album" : "/onboarding",
      );
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-20 md:py-28">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 text-center md:max-w-xl">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Stickr
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed md:text-xl">
            Intercambia figuritas del álbum Panini Mundial 2026 con
            coleccionistas de confianza. Arma tu álbum y coordina intercambios
            en un solo lugar.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button
            variant="outline"
            asChild
            size="lg"
            className="w-full sm:w-auto"
          >
            <Link href="/signup">Crear cuenta</Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Regístrate con correo o con Google / Apple. Sin spam: solo lo
          necesario para coordinar intercambios.
        </p>
      </div>
    </main>
  );
}
