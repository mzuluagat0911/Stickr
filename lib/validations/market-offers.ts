import { z } from "zod";

import { MARKET_CURRENCY_CODES } from "@/lib/marketplace/currency";
import { parseMajorPriceToCents } from "@/lib/validations/marketplace";

export const proposeMarketOfferFormSchema = z.object({
  currency: z.enum(MARKET_CURRENCY_CODES),
  priceMajor: z.string().min(1, "Indica un precio"),
});

export type ProposeMarketOfferFormInput = z.infer<
  typeof proposeMarketOfferFormSchema
>;

export function parseProposeMarketOffer(
  raw: unknown,
):
  | { ok: true; data: ProposeMarketOfferFormInput & { priceCents: number } }
  | { ok: false; message: string } {
  const parsed = proposeMarketOfferFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const cents = parseMajorPriceToCents(parsed.data.priceMajor.trim());
  if (cents == null) {
    return {
      ok: false,
      message:
        "Precio inválido. Ejemplos: 4200, 15.000, 15.000,50 o 4200,5 (coma para decimales).",
    };
  }
  if (cents < 50) {
    return {
      ok: false,
      message:
        "El precio debe ser al menos equivalente a 0,50 en tu moneda (centavos mínimos).",
    };
  }
  if (cents > 100_000_000) {
    return { ok: false, message: "El precio es demasiado alto." };
  }
  return { ok: true, data: { ...parsed.data, priceCents: cents } };
}
