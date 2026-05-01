"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { completeOnboardingAction } from "@/app/actions/auth";
import {
  ALBUM_EDITION_OPTIONS,
  PROFILE_LANGUAGE_OPTIONS,
} from "@/lib/constants/profile";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";

type Props = {
  defaultUsername: string;
  defaultAlbumEdition: string;
};

export function OnboardingForm({
  defaultUsername,
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
  const [languageCodes, setLanguageCodes] = useState<string[]>(["es"]);
  const [geoDetailsOpen, setGeoDetailsOpen] = useState(false);

  const [tradeInPerson, setTradeInPerson] = useState(false);
  const [tradeNationalShipping, setTradeNationalShipping] = useState(false);
  const [tradeInternationalShipping, setTradeInternationalShipping] =
    useState(false);
  const [saleInPerson, setSaleInPerson] = useState(false);
  const [saleNationalShipping, setSaleNationalShipping] = useState(false);
  const [saleInternationalShipping, setSaleInternationalShipping] =
    useState(false);
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

  const languagesCsv = languageCodes.join(",");

  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    undefined as ActionResult | undefined,
  );

  useEffect(() => {
    if (state && !state.ok) {
      toast.error(state.message);
    }
  }, [state]);

  const toggleLang = (code: string) => {
    setLanguageCodes((prev) => {
      const set = new Set(prev);
      if (set.has(code)) {
        if (set.size <= 1) return prev;
        set.delete(code);
      } else {
        set.add(code);
      }
      return [...set].sort(
        (a, b) =>
          PROFILE_LANGUAGE_OPTIONS.findIndex((o) => o.code === a) -
          PROFILE_LANGUAGE_OPTIONS.findIndex((o) => o.code === b),
      );
    });
  };

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
          <input type="hidden" name="languages" value={languagesCsv} />
          <input
            type="hidden"
            name="tradeInPerson"
            value={tradeInPerson ? "true" : "false"}
          />
          <input
            type="hidden"
            name="tradeNationalShipping"
            value={tradeNationalShipping ? "true" : "false"}
          />
          <input
            type="hidden"
            name="tradeInternationalShipping"
            value={tradeInternationalShipping ? "true" : "false"}
          />
          <input
            type="hidden"
            name="saleInPerson"
            value={saleInPerson ? "true" : "false"}
          />
          <input
            type="hidden"
            name="saleNationalShipping"
            value={saleNationalShipping ? "true" : "false"}
          />
          <input
            type="hidden"
            name="saleInternationalShipping"
            value={saleInternationalShipping ? "true" : "false"}
          />

          {/* Identidad */}
          <div className="space-y-4">
            <SectionEyebrow>Identidad</SectionEyebrow>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">
                Nombre de usuario
              </Label>
              <Input
                id="username"
                name="username"
                defaultValue={defaultUsername}
                autoComplete="username"
                placeholder="coleccionista_123"
                className="rounded-xl"
                required
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                Así te verán otros. Solo letras, números y guión bajo (3–32).
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

          {/* Preferencias */}
          <div className="space-y-4">
            <SectionEyebrow>Preferencias</SectionEyebrow>
            <div className="space-y-2">
              <Label>Idiomas</Label>
              <div className="flex flex-wrap gap-2">
                {PROFILE_LANGUAGE_OPTIONS.map((opt) => {
                  const on = languageCodes.includes(opt.code);
                  return (
                    <Button
                      key={opt.code}
                      type="button"
                      variant={on ? "default" : "outline"}
                      size="sm"
                      className="rounded-full px-4"
                      onClick={() => toggleLang(opt.code)}
                      disabled={pending}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-muted-foreground text-xs">
                Mantenemos al menos un idioma. Los puedes cambiar después en
                perfil.
              </p>
            </div>
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

          {/* Intercambio y venta */}
          <div className="space-y-4">
            <SectionEyebrow>Cómo planeas operar</SectionEyebrow>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Preferencias solo informativas; lo concreto lo acuerdas con otros
              fuera de la app.
            </p>
            <div className="space-y-2">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                Intercambio
              </p>
              <div className="border-border/70 flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
                <Label
                  htmlFor="ob-trade-ip"
                  className="cursor-pointer text-sm leading-snug"
                >
                  Encuentro en persona (intercambio)
                </Label>
                <Switch
                  id="ob-trade-ip"
                  checked={tradeInPerson}
                  onCheckedChange={setTradeInPerson}
                  disabled={pending}
                />
              </div>
              <div className="border-border/70 flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
                <Label htmlFor="ob-trade-ns" className="cursor-pointer text-sm">
                  Envío nacional (intercambio)
                </Label>
                <Switch
                  id="ob-trade-ns"
                  checked={tradeNationalShipping}
                  onCheckedChange={setTradeNationalShipping}
                  disabled={pending}
                />
              </div>
              <div className="border-border/70 flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
                <Label htmlFor="ob-trade-is" className="cursor-pointer text-sm">
                  Envío internacional (intercambio)
                </Label>
                <Switch
                  id="ob-trade-is"
                  checked={tradeInternationalShipping}
                  onCheckedChange={setTradeInternationalShipping}
                  disabled={pending}
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                Venta
              </p>
              <div className="border-border/70 flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
                <Label
                  htmlFor="ob-sale-ip"
                  className="cursor-pointer text-sm leading-snug"
                >
                  Venta en persona
                </Label>
                <Switch
                  id="ob-sale-ip"
                  checked={saleInPerson}
                  onCheckedChange={setSaleInPerson}
                  disabled={pending}
                />
              </div>
              <div className="border-border/70 flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
                <Label htmlFor="ob-sale-ns" className="cursor-pointer text-sm">
                  Venta con envío nacional
                </Label>
                <Switch
                  id="ob-sale-ns"
                  checked={saleNationalShipping}
                  onCheckedChange={setSaleNationalShipping}
                  disabled={pending}
                />
              </div>
              <div className="border-border/70 flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
                <Label htmlFor="ob-sale-is" className="cursor-pointer text-sm">
                  Venta con envío internacional
                </Label>
                <Switch
                  id="ob-sale-is"
                  checked={saleInternationalShipping}
                  onCheckedChange={setSaleInternationalShipping}
                  disabled={pending}
                />
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-4">
            <SectionEyebrow>WhatsApp</SectionEyebrow>
            <div className="space-y-2">
              <Label htmlFor="whatsappNational">Número (opcional)</Label>
              <Input
                id="whatsappNational"
                name="whatsappNational"
                autoComplete="tel-national"
                placeholder="Ej. 300 1234567"
                value={whatsappNational}
                onChange={(e) => setWhatsappNational(e.target.value)}
                className="rounded-xl"
                disabled={pending}
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                Se valida con el país declarado arriba. La visibilidad queda
                como &quot;solo después de coordinar&quot; hasta que la ajustes
                en perfil junto con Telegram o correo.
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
            disabled={pending || !city}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Guardando…
              </>
            ) : (
              "Continuar · paso siguiente"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
