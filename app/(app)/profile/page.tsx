import countries from "i18n-iso-countries";
import es from "i18n-iso-countries/langs/es.json";
import { UserRoundXIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";
import { countryFlagEmoji } from "@/lib/data/countries";
import { mapboxStaticPreviewUrl } from "@/lib/mapbox-static";
import type { ContactMethods } from "@/lib/types/profile";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

countries.registerLocale(es as import("i18n-iso-countries").LocaleData);

function channelConfigured(
  block: { number?: string; username?: string; address?: string } | undefined,
): boolean {
  if (!block) return false;
  if ("number" in block && (block as { number?: string }).number) return true;
  if ("username" in block && (block as { username?: string }).username)
    return true;
  if ("address" in block && (block as { address?: string }).address)
    return true;
  return false;
}

export default async function ProfilePage() {
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
    .select(
      "username, country_code, city, languages, album_edition, display_name, avatar_url, bio, contact_methods, trades_completed, rating_avg, rating_count",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
        <EmptyState
          icon={UserRoundXIcon}
          title="Todavía no tenemos tu perfil"
          description="Suele pasar al registrarte: completa el onboarding para crear tu ficha visible y seguir usando el álbum."
          action={
            <Button size="lg" className="rounded-full px-8" asChild>
              <Link href="/onboarding">Ir al onboarding</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { data: coordJson } = await supabase.rpc("get_my_jittered_coordinates");

  const coords = coordJson as { lat: number; lng: number } | null | undefined;
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const mapUrl =
    coords && mapToken
      ? mapboxStaticPreviewUrl(coords.lat, coords.lng, mapToken, {
          width: 600,
          height: 280,
          zoom: 11,
        })
      : null;

  const languages = (profile.languages as string[] | null) ?? [];
  const langsLabel = languages.length > 0 ? languages.join(", ") : "—";
  const cm = profile.contact_methods as ContactMethods | null;
  const countryName =
    countries.getName(profile.country_code as string, "es") ??
    profile.country_code;
  const flag = countryFlagEmoji(profile.country_code as string);
  const display =
    (profile.display_name as string | null)?.trim() ||
    (profile.username as string);
  const initial = display.slice(0, 2).toUpperCase();
  const rating = Number.parseFloat(String(profile.rating_avg ?? "0"));
  const trades = Number(profile.trades_completed ?? 0);

  const waOk = channelConfigured(cm?.whatsapp);
  const tgOk = channelConfigured(cm?.telegram);
  const emOk = channelConfigured(cm?.email_public);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <Avatar className="size-20 rounded-xl border sm:size-24">
            {profile.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url as string}
                alt=""
                className="rounded-xl object-cover"
              />
            ) : null}
            <AvatarFallback className="rounded-xl text-lg">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{display}</h1>
            <p className="text-muted-foreground">
              @{profile.username as string}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-normal">
                {flag} {countryName}
              </Badge>
              <Badge variant="outline" className="font-normal">
                {(profile.album_edition as string) ?? "—"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/profile/edit">Editar perfil</Link>
          </Button>
          <Button variant="ghost" asChild className="w-full sm:w-auto">
            <Link href="/privacy">Configurar privacidad</Link>
          </Button>
        </div>
      </div>

      {profile.bio ? (
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          {profile.bio as string}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Álbum completo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">0%</p>
            <p className="text-muted-foreground text-xs">Hasta Fase 2.2</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Faltantes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">980</p>
            <p className="text-muted-foreground text-xs">Placeholder</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Repetidas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">0</p>
            <p className="text-muted-foreground text-xs">Placeholder</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Intercambios / Reputación</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{trades}</p>
            <p className="text-muted-foreground text-xs">
              {rating > 0 ? `${rating.toFixed(1)} ★` : "Sin calificaciones aún"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mi ubicación</CardTitle>
            <CardDescription>
              Mapa centrado en tu posición guardada con jitter (±500 m). No es
              tu ubicación exacta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mapUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mapUrl}
                alt="Mapa aproximado de tu zona"
                className="bg-muted w-full rounded-lg border object-cover"
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                {coords
                  ? "Configurá NEXT_PUBLIC_MAPBOX_TOKEN para ver el mapa estático."
                  : "Todavía no hay ubicación aproximada. Puedes añadirla desde editar perfil."}
              </p>
            )}
            <p className="text-muted-foreground text-sm">
              Ciudad declarada:{" "}
              <span className="text-foreground font-medium">
                {profile.city as string}, {profile.country_code as string}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métodos de contacto</CardTitle>
            <CardDescription>
              Coordinación fuera de la app. No mostramos números ni usuarios
              acá.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              {waOk ? "✓" : "—"} WhatsApp{" "}
              {waOk ? "configurado" : "no configurado o oculto"}
            </p>
            <p className="flex items-center gap-2">
              {tgOk ? "✓" : "—"} Telegram{" "}
              {tgOk ? "configurado" : "no configurado o oculto"}
            </p>
            <p className="flex items-center gap-2">
              {emOk ? "✓" : "—"} Correo público{" "}
              {emOk ? "configurado" : "no configurado o oculto"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Idiomas
            </p>
            <p className="mt-1 font-medium">{langsLabel}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
