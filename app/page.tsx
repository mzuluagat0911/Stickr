import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";

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
    <main className="relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/images/world-cup-banner.png"
          alt="Trofeo del Mundial y bandera de Estados Unidos"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
      </div>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 text-center md:max-w-xl">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            Stickr
          </h1>
          <p className="text-lg leading-relaxed text-white/90 md:text-xl">
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
        <p className="text-sm leading-relaxed text-white/80">
          Regístrate con correo. Sin spam: solo lo necesario para coordinar
          intercambios.
        </p>
      </div>
    </main>
  );
}
