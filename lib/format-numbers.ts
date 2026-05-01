/** Locale Colombia: agrupación y decimales según ICU (similar al uso local con coma decimal). */
export const APP_NUMBER_LOCALE = "es-CO" as const;

/** Enteros con separador de miles (ej. 1.234). */
export function formatIntegerEs(n: number): string {
  return new Intl.NumberFormat(APP_NUMBER_LOCALE, {
    maximumFractionDigits: 0,
  }).format(n);
}

/** Decimales según `APP_NUMBER_LOCALE` (sufijo «Es» conservado por compatibilidad). */
export function formatDecimalEs(n: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(APP_NUMBER_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(n);
}
