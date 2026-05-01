import { City, type ICity } from "country-state-city";

export type { ICity };

export function formatCityLabel(c: ICity): string {
  const st = (c.stateCode ?? "").trim();
  return st.length > 0 ? `${c.name} (${st})` : c.name;
}

/** Ciudades del país ISO-3166-1 alpha-2, ordenadas para listas y búsqueda. */
export function getCitiesOfCountrySorted(iso2: string): ICity[] {
  const cc = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return [];
  const raw = City.getCitiesOfCountry(cc);
  if (!raw?.length) return [];
  return [...raw].sort((a, b) =>
    formatCityLabel(a).localeCompare(formatCityLabel(b), "es", {
      sensitivity: "base",
    }),
  );
}
