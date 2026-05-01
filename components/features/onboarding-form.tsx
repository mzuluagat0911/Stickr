"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { completeOnboardingAction } from "@/app/actions/auth";
import { ALBUM_EDITION_OPTIONS } from "@/lib/constants/profile";
import {
  formatCityLabel,
  getCitiesOfCountrySorted,
} from "@/lib/data/world-cities";
import type { ActionResult } from "@/lib/types/result";

import { CityPicker } from "@/components/features/city-picker";
import { CountryPicker } from "@/components/features/country-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";

type Props = {
  defaultDisplayName: string;
  defaultAlbumEdition: string;
};

export function OnboardingForm({
  defaultDisplayName,
  defaultAlbumEdition,
}: Props) {
  const [countryCode, setCountryCode] = useState("CO");

  const cities = useMemo(
    () => getCitiesOfCountrySorted(countryCode),
    [countryCode],
  );
  const defaultCityLabel = useMemo(
    () => (cities[0] ? formatCityLabel(cities[0]) : ""),
    [cities],
  );

  const [city, setCity] = useState(defaultCityLabel);
  const [albumEdition, setAlbumEdition] = useState(defaultAlbumEdition);
  const [geoDetailsOpen, setGeoDetailsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [tradeScope, setTradeScope] = useState<"local_only" | "national">(
    "local_only",
  );
  const [whatsappNational, setWhatsappNational] = useState("");

  const handleCountryChange = (code: string) => {
    const nextCode = code.toUpperCase();
    const nextCities = getCitiesOfCountrySorted(nextCode);
    const nextDefaultCity = nextCities[0] ? formatCityLabel(nextCities[0]) : "";

    setCountryCode(nextCode);
    setCity((prev) => {
      const stillValid = nextCities.some((c) => formatCityLabel(c) === prev);
      return stillValid ? prev : nextDefaultCity;
    });
  };

  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    undefined as ActionResult | undefined,
  );

  useEffect(() => {
    if (state && !state.ok) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Card className="border-border/80 w-full max-w-lg shadow-lg shadow-black/5">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Completa tu perfil
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Creamos tu ficha para el álbum, intercambios y ventas. Puedes cambiar
          todo más tarde desde el perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form action={formAction} className="flex flex-col gap-8">
          <input
            type="hidden"
            name="tradeNationalShipping"
            value={tradeScope === "national" ? "true" : "false"}
          />

          {/* Identidad */}
          <div className="space-y-4">
            <SectionEyebrow>Identidad</SectionEyebrow>
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-foreground">
                Nombre visible
              </Label>
              <Input
                id="displayName"
                name="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                placeholder="Ej. Mateo"
                className="rounded-xl"
                required
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                Así te verán otros coleccionistas.
              </p>
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-4">
            <SectionEyebrow>Ubicación</SectionEyebrow>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <CountryPicker
                  id="countryCode"
                  label="País"
                  value={countryCode}
                  onChange={handleCountryChange}
                  disabled={pending}
                  className="[&_button]:rounded-xl"
                />
                <input type="hidden" name="countryCode" value={countryCode} />
              </div>
              <div className="sm:col-span-1">
                <CityPicker
                  id="city"
                  countryCode={countryCode}
                  value={city}
                  onChange={setCity}
                  disabled={pending}
                  className="[&_button]:rounded-xl"
                />
                <input type="hidden" name="city" value={city} />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              En países con muchas ciudades escribí al menos 2 letras en el
              buscador.
            </p>
          </div>

          {/* Edición */}
          <div className="space-y-4">
            <SectionEyebrow>Álbum</SectionEyebrow>
            <div className="space-y-2">
              <Label htmlFor="albumEdition">Edición del álbum</Label>
              <Select
                value={albumEdition}
                onValueChange={setAlbumEdition}
                disabled={pending}
              >
                <SelectTrigger id="albumEdition" className="w-full rounded-xl">
                  <SelectValue placeholder="Elige edición" />
                </SelectTrigger>
                <SelectContent>
                  {ALBUM_EDITION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="albumEdition" value={albumEdition} />
            </div>
          </div>

          {/* Preferencias de intercambio */}
          <div className="space-y-4">
            <SectionEyebrow>Preferencia de intercambio</SectionEyebrow>
            <div
              role="radiogroup"
              aria-label="Preferencia de intercambio"
              className="bg-muted/70 border-border/60 grid grid-cols-2 gap-1 rounded-xl border p-1"
            >
              <Button
                type="button"
                role="radio"
                aria-checked={tradeScope === "local_only"}
                variant={tradeScope === "local_only" ? "secondary" : "ghost"}
                className="h-auto min-h-[2.75rem] rounded-lg px-2 py-2.5 text-center text-xs leading-snug sm:text-sm"
                onClick={() => setTradeScope("local_only")}
                disabled={pending}
              >
                Solo local
              </Button>
              <Button
                type="button"
                role="radio"
                aria-checked={tradeScope === "national"}
                variant={tradeScope === "national" ? "secondary" : "ghost"}
                className="h-auto min-h-[2.75rem] rounded-lg px-2 py-2.5 text-center text-xs leading-snug sm:text-sm"
                onClick={() => setTradeScope("national")}
                disabled={pending}
              >
                Local + envío nacional
              </Button>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Esta preferencia se usa para sugerencias de matches.
            </p>
          </div>

          {/* WhatsApp */}
          <div className="space-y-4">
            <SectionEyebrow>WhatsApp</SectionEyebrow>
            <div className="space-y-2">
              <Label htmlFor="whatsappNational">Número (obligatorio)</Label>
              <Input
                id="whatsappNational"
                name="whatsappNational"
                autoComplete="tel-national"
                placeholder="Ej. 300 1234567"
                value={whatsappNational}
                onChange={(e) => setWhatsappNational(e.target.value)}
                className="rounded-xl"
                disabled={pending}
                required
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                Se valida con formato internacional (E.164) usando tu país.
              </p>
            </div>
          </div>

          {/* Mapa opcional */}
          <div className="border-border/70 bg-muted/30 space-y-3 rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="geoOptIn"
                name="geoOptIn"
                value="true"
                className="border-primary/40 text-primary accent-primary mt-1 size-4 shrink-0 rounded-md"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="geoOptIn"
                  className="cursor-pointer leading-snug"
                >
                  Permitir ubicación aproximada para mapa / descubrimiento
                  (opcional).
                </Label>
                <Collapsible
                  open={geoDetailsOpen}
                  onOpenChange={setGeoDetailsOpen}
                >
                  <CollapsibleTrigger className="text-primary text-xs font-medium">
                    ¿Qué guardamos exactamente?
                  </CollapsibleTrigger>
                  <CollapsibleContent className="text-muted-foreground pt-2 text-xs leading-relaxed">
                    Solo un punto ya desplazado (±500 m) cuando más adelante
                    pidas ubicación; el GPS exacto no se persiste en la base.
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>

          {state && !state.ok ? (
            <p
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {state.message}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-base shadow-md"
            disabled={pending || !city || !displayName.trim()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Guardando…
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
