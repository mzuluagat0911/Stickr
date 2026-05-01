"use client";

import { useMemo, useState } from "react";

import {
  formatCityLabel,
  getCitiesOfCountrySorted,
} from "@/lib/data/world-cities";

import type { ICity } from "country-state-city";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CityPickerProps = {
  id?: string;
  countryCode: string;
  value: string;
  onChange: (cityLabel: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

const LARGE_THRESHOLD = 150;

export function CityPicker({
  id,
  countryCode,
  value,
  onChange,
  disabled,
  label = "Ciudad",
  className,
}: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const cc = countryCode.trim().toUpperCase();
  const cities = useMemo(() => getCitiesOfCountrySorted(cc), [cc]);
  const isLarge = cities.length >= LARGE_THRESHOLD;

  const filtered: ICity[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (cities.length === 0) return [];
    if (isLarge && q.length < 2) return [];
    if (!q) {
      if (isLarge) return [];
      return cities.slice(0, 120);
    }
    const out = cities
      .filter((c) => formatCityLabel(c).toLowerCase().includes(q))
      .slice(0, 200);
    return out;
  }, [cities, query, isLarge]);

  const pickerLabel = `${label}${value ? `: ${value}` : ": ciudad sin elegir"}`;

  return (
    <div className={cn("relative space-y-2", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Button
        type="button"
        variant="outline"
        id={id}
        disabled={disabled || !cc || cc.length !== 2}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={pickerLabel}
        className="focus-visible:ring-ring focus-visible:border-ring border-input h-auto min-h-10 w-full justify-start px-3 py-2 text-left font-normal focus-visible:ring-3"
        onClick={() => setOpen((o) => !o)}
      >
        {value ? (
          <span className="truncate">{value}</span>
        ) : (
          <span className="text-muted-foreground">Elige ciudad</span>
        )}
      </Button>
      {!cc || cc.length !== 2 ? (
        <p className="text-muted-foreground text-xs">Elige un país primero.</p>
      ) : cities.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No hay ciudades en el catálogo para este país ({cc}).
        </p>
      ) : null}

      {open ? (
        <div className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full rounded-xl border p-2 shadow-md">
          <Input
            placeholder={
              isLarge
                ? "Buscá (escribí 2 letras como mínimo)…"
                : "Buscar ciudad…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
            autoFocus
          />
          {isLarge && query.trim().length < 2 ? (
            <p className="text-muted-foreground px-2 py-3 text-center text-xs">
              Hay muchas ciudades en este país; escribí al menos dos letras para
              listar opciones.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground px-2 py-3 text-center text-xs">
              Sin coincidencias. Prueba con otra palabra.
            </p>
          ) : (
            <ul
              className="max-h-60 overflow-y-auto overscroll-contain text-sm"
              role="listbox"
            >
              {filtered.map((c, idx) => {
                const lab = formatCityLabel(c);
                const key = `${lab}-${idx}`;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left"
                      onClick={() => {
                        onChange(lab);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span className="truncate">{lab}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
