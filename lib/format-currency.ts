import { APP_NUMBER_LOCALE } from "@/lib/format-numbers";
import {
  MARKET_CURRENCY_CODES,
  type MarketCurrencyCode,
} from "@/lib/marketplace/currency";

export function formatMinorCurrency(
  amountCents: number,
  currencyCode = "ARS",
): string {
  const normalized = currencyCode.trim().toUpperCase();
  const code = (
    MARKET_CURRENCY_CODES.includes(normalized as MarketCurrencyCode)
      ? normalized
      : "ARS"
  ) as MarketCurrencyCode;

  return new Intl.NumberFormat(APP_NUMBER_LOCALE, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}
