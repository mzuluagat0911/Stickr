import countries from "i18n-iso-countries";
import es from "i18n-iso-countries/langs/es.json";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchDiscoverPeersContact } from "@/lib/discover/fetch-discover-peers-contact";
import { discoverCollectorsSameCity } from "@/lib/discover/same-city";
import { profileDisplayLabel } from "@/lib/profile/display-label";
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

  const shellClass =
    "relative isolate min-w-0 space-y-8 rounded-[1.75rem] border border-black/10 bg-white/95 px-5 py-7 text-zinc-900 shadow-[0_25px_60px_-12px_rgb(0_0_0_/_0.28)] ring-1 ring-black/10 backdrop-blur-md backdrop-saturate-150 dark:border-white/12 dark:bg-zinc-950/95 dark:text-zinc-50 dark:ring-white/10 md:space-y-10 md:px-8 md:py-9";

  let collectors:
    | {
        ok: true;
        list: Awaited<ReturnType<typeof discoverCollectorsSameCity>>;
        contactWarning: string | null;
      }
    | { ok: false; message: string };

  try {
    const list = await discoverCollectorsSameCity(user.id, 200);
    const peerIds = list.map((c) => c.otherUserId);
    const displayNameByPeer = new Map<string, string>();

    if (peerIds.length > 0) {
      const { data: peerProfiles } = await supabase
        .from("user_profiles")
        .select("id, display_name, username")
        .in("id", peerIds);
      for (const row of peerProfiles ?? []) {
        if (row.id) {
          displayNameByPeer.set(
            row.id,
            profileDisplayLabel(
              row.display_name as string | null,
              row.username as string | null,
            ),
          );
        }
      }
    }

    let enriched = list.map((c) => ({
      ...c,
      peerDisplayName:
        displayNameByPeer.get(c.otherUserId) ?? c.peerDisplayName,
      whatsappE164: null as string | null,
      whatsappLocked: false,
    }));
    let contactWarning: string | null = null;
    try {
      const contactMap = await fetchDiscoverPeersContact(peerIds);
      enriched = list.map((c) => {
        const info = contactMap.get(c.otherUserId);
        return {
          ...c,
          peerDisplayName:
            displayNameByPeer.get(c.otherUserId) ?? c.peerDisplayName,
          whatsappE164: info?.whatsappE164 ?? null,
          whatsappLocked: info?.whatsappLocked ?? false,
        };
      });
      const withWa = enriched.filter((c) => c.whatsappE164).length;
      if (list.length > 0 && withWa === 0) {
        contactWarning =
          "Ningún coleccionista tiene WhatsApp visible aquí. En Perfil → Editar, guardá tu número y dejá la visibilidad distinta de «Nunca». Los demás deben hacer lo mismo.";
      }
    } catch (contactErr) {
      const msg =
        contactErr instanceof Error ? contactErr.message : "Error de contacto";
      contactWarning =
        msg.includes("get_discover_peers_contact") ||
        msg.includes("does not exist")
          ? `${msg} — Ejecutá de nuevo scripts/supabase/0024-discover-peer-contact.sql en Supabase.`
          : `${msg} — No pudimos cargar WhatsApp en las tarjetas.`;
    }
    collectors = { ok: true, list: enriched, contactWarning };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "No pudimos cargar los coleccionistas.";
    const permissionDenied =
      /permission denied|42501|insufficient_privilege/i.test(msg);
    collectors = {
      ok: false,
      message: permissionDenied
        ? `${msg} — En Supabase ejecutá scripts/supabase/0023-part3-grants-fix.sql (permisos RPC tras migración 0023).`
        : msg.includes("discover_collectors") || msg.includes("function")
          ? `${msg}. Si estás en local, aplica las migraciones en Supabase (incluye 0008 y 0023).`
          : msg,
    };
  }

  const locationLabel = city && countryCode ? `${city}, ${countryCode}` : null;

  return (
    <div className={shellClass}>
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl md:tracking-tighter">
          Intercambio
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-700 md:text-[0.9375rem] md:leading-snug dark:text-zinc-200">
          Coleccionistas con perfil visible en Stickr
          {locationLabel ? (
            <>
              {" "}
              (priorizamos los de{" "}
              <span className="font-semibold text-zinc-900 dark:text-white">
                {city}
              </span>
              {countryName ? (
                <>
                  ,{" "}
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {countryName}
                  </span>
                </>
              ) : countryCode ? (
                <> ({countryCode})</>
              ) : null}
              )
            </>
          ) : (
            <> (completa tu ciudad en el perfil para resaltar los de tu zona)</>
          )}
          . Cada tarjeta muestra la ciudad y, si lo permiten, un enlace a
          WhatsApp con el número. El orden favorece cruces útiles con tus faltas
          y prioridades del álbum.
        </p>
        {!city || !countryCode ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            <Link
              href="/profile/edit"
              className="font-medium text-[#2b59c3] underline-offset-4 hover:underline dark:text-sky-400"
            >
              Añade ciudad y país en tu perfil
            </Link>{" "}
            para identificar mejor quién está cerca.
          </p>
        ) : null}
        <details className="max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <summary className="cursor-pointer list-none py-1 text-xs font-semibold text-[#2b59c3] underline-offset-4 hover:underline dark:text-sky-400 [&::-webkit-details-marker]:hidden">
            Más detalles sobre esta vista
          </summary>
          <div className="mt-2 space-y-2 border-l-2 border-zinc-300 pl-3 text-xs leading-relaxed text-zinc-700 md:text-[0.8125rem] dark:border-zinc-600 dark:text-zinc-300">
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
      ) : null}

      {collectors.ok && collectors.contactWarning ? (
        <p
          role="status"
          className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:text-amber-100"
        >
          {collectors.contactWarning}
        </p>
      ) : null}

      {collectors.ok && collectors.list.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Todavía no hay otros coleccionistas visibles"
          description="Cuando más personas completen el onboarding y tengan el álbum visible (no privado), aparecerán aquí con su ciudad y avance."
        />
      ) : collectors.ok ? (
        <DiscoverCollectorsList collectors={collectors.list} />
      ) : null}
    </div>
  );
}
