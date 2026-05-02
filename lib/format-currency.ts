import { APP_NUMBER_LOCALE } from "@/lib/format-numbers";
import {
  MARKET_CURRENCY_CODES,
  type MarketCurrencyCode,
} from "@/lib/marketplace/currency";

export function formatMinorCurrency(
  amountCents: number,
  currencyCode: string | null | undefined = "ARS",
): string {
  const raw =
    typeof currencyCode === "string" && currencyCode.length > 0
      ? currencyCode
      : "ARS";
  const normalized = raw.trim().toUpperCase();
  const code = (
    MARKET_CURRENCY_CODES.includes(normalized as MarketCurrencyCode)
      ? normalized
      : "ARS"
  ) as MarketCurrencyCode;

  const major = Number.isFinite(amountCents) ? amountCents / 100 : 0;
  try {
    return new Intl.NumberFormat(APP_NUMBER_LOCALE, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${code}`;
  }
}
