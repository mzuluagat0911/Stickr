import countries from "i18n-iso-countries";
import es from "i18n-iso-countries/langs/es.json";

countries.registerLocale(es as import("i18n-iso-countries").LocaleData);

export type CountryOption = {
  code: string;
  name: string;
  flag: string;
};

/** Emoji bandera ISO 3166-1 alpha-2 (regional indicators). */
export function countryFlagEmoji(iso2: string): string {
  const u = iso2.toUpperCase();
  if (u.length !== 2 || /[^A-Z]/.test(u)) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + u.charCodeAt(0) - 65,
    A + u.charCodeAt(1) - 65,
  );
}

/** Lista ordenada por nombre (es) para pickers (~250 países). */
export function getAllCountriesEs(): CountryOption[] {
  const names = countries.getNames("es", { select: "official" });
  return Object.entries(names)
    .map(([code, name]) => ({
      code: code.toUpperCase(),
      name: typeof name === "string" ? name : (name[0] ?? code),
      flag: countryFlagEmoji(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export const ALL_COUNTRIES_ES: CountryOption[] = getAllCountriesEs();
