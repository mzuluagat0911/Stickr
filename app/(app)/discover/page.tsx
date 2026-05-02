import countries from "i18n-iso-countries";
import es from "i18n-iso-countries/langs/es.json";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { discoverCollectorsSameCity } from "@/lib/discover/same-city";
import { formatDecimalEs, formatIntegerEs } from "@/lib/format-numbers";
import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";

import { DiscoverExchangeChatButton } from "@/components/features/discover-exchange-chat-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div className="space-y-8 md:space-y-10">
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
    <div className="space-y-8 md:space-y-10">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl md:tracking-tighter">
          Intercambio
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed md:text-[0.9375rem] md:leading-snug">
          Aquí encuentras coleccionistas con sede en la ciudad{" "}
          <span className="text-foreground font-medium">{city}</span>,{" "}
          {countryName ? (
            <span className="text-foreground font-medium">{countryName}</span>
          ) : (
            countryCode
          )}
          , para coordinar cambios cara a cara o por tus medios de contacto. Las
          tarjetas con más coincidencia van primero: repetidas que tú necesitas
          (lo que falta o marcaste con prioridad en el álbum). Cuando hay
          cruces, podés abrir un chat para coordinar el intercambio. Los
          porcentajes siguen la edición de cada persona. No mostramos perfiles
          con el álbum en privado.
        </p>
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
        <ul className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {collectors.list.map((c) => (
            <li key={c.otherUserId}>
              <Card className="border-border/70 h-full rounded-2xl shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="space-y-2 pb-3">
                  <CardTitle className="font-heading text-lg font-semibold tracking-tight">
                    @{c.username}
                  </CardTitle>
                  {c.matchDistinctHelp > 0 ? (
                    <div className="space-y-1">
                      <p className="text-primary text-sm leading-snug font-semibold">
                        Repetidas que te sirven:{" "}
                        <span className="tabular-nums">
                          {formatIntegerEs(c.matchDistinctHelp)}
                        </span>{" "}
                        tipos distintos ·{" "}
                        <span className="tabular-nums">
                          {formatIntegerEs(c.matchTradableQty)}
                        </span>{" "}
                        ejemplares de más disponibles
                      </p>
                      {c.wishlistOverlapDistinct > 0 ? (
                        <p className="text-muted-foreground text-xs">
                          <span className="text-foreground font-medium tabular-nums">
                            {formatIntegerEs(c.wishlistOverlapDistinct)}
                          </span>{" "}
                          en tu lista prioritaria (⭐ en el álbum)
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Sin cruces por ahora con tus faltas o prioridades (misma
                      edición que la tuya y mismas IDs de catálogo).
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="bg-muted/50 rounded-xl px-3.5 py-2.5">
                      <dt className="text-muted-foreground mb-1 text-[0.6875rem] font-medium tracking-wide uppercase">
                        Álbum
                      </dt>
                      <dd className="text-muted-foreground text-lg font-semibold tracking-tight">
                        <span className="text-foreground tabular-nums">
                          {formatDecimalEs(c.albumPercent, 1)}
                        </span>
                        {" % lleno"}
                      </dd>
                    </div>
                    <div className="bg-muted/50 rounded-xl px-3.5 py-2.5">
                      <dt className="text-muted-foreground mb-1 text-[0.6875rem] font-medium tracking-wide uppercase">
                        Repetidas
                      </dt>
                      <dd className="text-lg leading-tight tracking-tight">
                        <span className="text-foreground tabular-nums">
                          {formatIntegerEs(c.duplicateDistinct)}
                        </span>{" "}
                        <span className="text-muted-foreground text-[0.8125rem] leading-snug font-normal">
                          figurita{c.duplicateDistinct === 1 ? "" : "s"}
                        </span>
                      </dd>
                    </div>
                    <div className="bg-muted/50 rounded-xl px-3.5 py-2.5">
                      <dt className="text-muted-foreground mb-1 text-[0.6875rem] font-medium tracking-wide uppercase">
                        Para cambiar
                      </dt>
                      <dd className="text-lg leading-tight tracking-tight">
                        <span className="text-foreground tabular-nums">
                          {formatIntegerEs(c.duplicatesForTrade)}
                        </span>{" "}
                        <span className="text-muted-foreground text-[0.8125rem] leading-snug font-normal">
                          ejemplar{c.duplicatesForTrade === 1 ? "" : "es"} de
                          más
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <p className="text-muted-foreground border-border/60 border-t pt-3 text-xs leading-relaxed">
                    Coordina reuniones por los canales configurados cuando haya
                    confianza mutua; en esta vista solo ves datos públicos para
                    orientarte.
                  </p>
                </CardContent>
                {c.matchDistinctHelp > 0 || c.wishlistOverlapDistinct > 0 ? (
                  <CardFooter className="border-border/50 flex flex-col gap-2 border-t pt-4 pb-4 sm:flex-row sm:items-center">
                    <DiscoverExchangeChatButton
                      otherUserId={c.otherUserId}
                      username={c.username?.trim() || "coleccionista"}
                    />
                  </CardFooter>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
