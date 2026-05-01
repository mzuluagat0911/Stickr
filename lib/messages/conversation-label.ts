/** Datos mínimos de `market_intentions` embebidos en listados de conversaciones. */
export type MarketIntentEmbed = {
  sticker_number?: number | null;
  kind?: string | null;
  currency?: string | null;
} | null;

export function conversationMarketLabel(mi: MarketIntentEmbed): string | null {
  if (!mi || typeof mi !== "object") return null;
  const n =
    typeof mi.sticker_number === "number" && Number.isFinite(mi.sticker_number)
      ? mi.sticker_number
      : null;
  if (n == null) return "Compra/venta";
  const kind = mi.kind === "sell" ? "Venta" : "Compra";
  const ccy =
    typeof mi.currency === "string" && mi.currency.length === 3
      ? mi.currency
      : "";
  return ccy ? `${kind} · #${n} (${ccy})` : `${kind} · #${n}`;
}
