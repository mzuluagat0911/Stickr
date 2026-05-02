export const MARKET_CURRENCY_CODES = ["ARS", "USD", "COP", "EUR"] as const;

export type MarketCurrencyCode = (typeof MARKET_CURRENCY_CODES)[number];

export const MARKET_CURRENCY_UI: Record<
  MarketCurrencyCode,
  { label: string; hint: string }
> = {
  ARS: { label: "ARS — Pesos argentinos", hint: "Argentina" },
  USD: {
    label: "USD — Dólar estadounidense",
    hint: "EE.UU., México y Centroamérica",
  },
  COP: { label: "COP — Pesos colombianos", hint: "Colombia" },
  EUR: { label: "EUR — Euro", hint: "Europa (referencia habitual)" },
};

/** Países con default USD según definición regional del producto. */
const USD_USA_CENTROAMERICA_ISO = new Set([
  "US",
  "MX",
  "BZ",
  "GT",
  "SV",
  "HN",
  "NI",
  "CR",
  "PA",
]);

/**
 * Europa (valor por defecto EUR; el usuario puede elegir USD u otra en el formulario).
 * Excluimos algunos territorios grandes que no tratamos como “Europa habitual” por defecto EUR.
 */
const EUR_DEFAULT_ISO = new Set([
  "AL",
  "AD",
  "AT",
  "BE",
  "BA",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IS",
  "IE",
  "IT",
  "XK",
  "LV",
  "LI",
  "LT",
  "LU",
  "MK",
  "MT",
  "MD",
  "MC",
  "ME",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SM",
  "RS",
  "SK",
  "SI",
  "ES",
  "SE",
  "CH",
  "UA",
  "VA",
  "GB",
  "GG",
  "JE",
  "IM",
  "GI",
  "FO",
  "AX",
]);

export function isMarketCurrency(code: unknown): code is MarketCurrencyCode {
  return (
    typeof code === "string" &&
    MARKET_CURRENCY_CODES.includes(code as MarketCurrencyCode)
  );
}

/** Moneda inicial sugerida según país del perfil. */
export function defaultMarketCurrency(
  countryCode: string | null | undefined | unknown,
): MarketCurrencyCode {
  const cc =
    countryCode == null || countryCode === ""
      ? ""
      : String(countryCode).trim().toUpperCase();
  if (cc === "AR") return "ARS";
  if (cc === "CO") return "COP";
  if (USD_USA_CENTROAMERICA_ISO.has(cc)) return "USD";
  if (EUR_DEFAULT_ISO.has(cc)) return "EUR";
  return "USD";
}

/** Preferir `APP_NUMBER_LOCALE` en UI; esto sirve si en el futuro se formatea por moneda. */
export function marketCurrencyLocale(ccy: MarketCurrencyCode): string {
  void ccy;
  return "es-CO";
}
