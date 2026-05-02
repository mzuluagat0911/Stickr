import countries from "i18n-iso-countries";
import es from "i18n-iso-countries/langs/es.json";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { discoverCollectorsSameCity } from "@/lib/discover/same-city";
import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";

import { DiscoverCollectorsList } from "@/components/features/discover-collectors-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

countries.registerLocale(es as import("i18n-iso-countries").LocaleData);

export default async function DiscoverPage() {
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
    .select("city, country_code")
    .eq("id", user.id)
    .maybeSingle();

  const city = (profile?.city as string | undefined)?.trim() ?? "";
  const countryCode =
    typeof profile?.country_code === "string"
      ? profile.country_code.trim().toUpperCase()
      : "";
  const countryName =
    (countryCode && countries.getName(countryCode, "es")) ?? countryCode;

  if (!city || !countryCode) {
    return (
      <div className="min-w-0 space-y-8 md:space-y-10">
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl md:tracking-tighter">
          Intercambio
        </h1>
        <EmptyState
          icon={MapPin}
          title="Completa tu ciudad para ver con quién intercambiar"
          description="Usamos la ciudad y el país que declaras en el perfil para listar coleccionistas cerca con figuritas repetidas o que te falten para completar tu álbum."
          action={
            <Button asChild className="rounded-full">
              <Link href="/profile/edit">Completar ciudad en perfil</Link>
            </Button>
          }
        />
      </div>
    );
  }

  let collectors:
    | { ok: true; list: Awaited<ReturnType<typeof discoverCollectorsSameCity>> }
    | { ok: false; message: string };

  try {
    const list = await discoverCollectorsSameCity(user.id, 120);
    collectors = { ok: true, list };
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "No pudimos cargar los coleccionistas de tu ciudad.";
    collectors = {
      ok: false,
      message:
        msg.includes("discover_collectors") || msg.includes("function")
          ? `${msg}. Si estás en local, aplica las migraciones en Supabase (incluye 0005 y 0008).`
          : msg,
    };
  }

  const locationLabel = `${city}, ${countryCode}`;

  return (
    <div className="min-w-0 space-y-8 md:space-y-10">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl md:tracking-tighter">
          Intercambio
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed md:text-[0.9375rem] md:leading-snug">
          Coleccionistas en{" "}
          <span className="text-foreground font-medium">{city}</span>
          {countryName ? (
            <>
              ,{" "}
              <span className="text-foreground font-medium">{countryName}</span>
            </>
          ) : (
            <> ({countryCode})</>
          )}
          . Las tarjetas van ordenadas por qué tan bien encajan sus repetidas
          con tus faltas y prioridades del álbum.
        </p>
        <details className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          <summary className="text-primary hover:text-primary/90 cursor-pointer list-none py-1 text-xs font-medium underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
            Más detalles sobre esta vista
          </summary>
          <div className="border-border/60 mt-2 space-y-2 border-l-2 pl-3 text-xs leading-relaxed md:text-[0.8125rem]">
            <p>
              Podés coordinar cambios cara a cara o por los medios de contacto
              que cada uno configure en el perfil. Cuando hay cruces claros, el
              botón abre un chat solo para intercambio (no marketplace).
            </p>
            <p>
              Los porcentajes de álbum corresponden a la edición de cada
              persona. No listamos perfiles con el álbum en modo privado.
            </p>
          </div>
        </details>
      </header>

      {!collectors.ok ? (
        <p
          role="alert"
          className="text-destructive border-destructive/30 bg-destructive/10 rounded-xl border px-4 py-3 text-sm leading-relaxed"
        >
          {collectors.message}
        </p>
      ) : collectors.list.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Todavía no hay nadie más por acá"
          description={`Cuando haya otros con la misma ciudad que registraste (${locationLabel}), aparecerán en la lista con su avance en el álbum y sus repetidas.`}
        />
      ) : (
        <DiscoverCollectorsList collectors={collectors.list} />
      )}
    </div>
  );
}
