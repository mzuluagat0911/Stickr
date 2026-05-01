import { z } from "zod";

import { MARKET_CURRENCY_CODES } from "@/lib/marketplace/currency";

/** Colombia / ICU `es-CO`: coma decimal `1.234,5`; punto ocasional antes de coma; puntos como miles `15.000`. */
export function parseMajorPriceToCents(raw: string): number | null {
  const t = raw
    .trim()
    .replace(/^\$\s*/u, "")
    .replace(/\s+/g, "");
  if (!t) return null;

  const commaIdx = t.lastIndexOf(",");
  if (commaIdx >= 0) {
    const dec = t.slice(commaIdx + 1);
    if (!/^\d{1,2}$/.test(dec)) return null;
    const intSection = t.slice(0, commaIdx).replace(/\./g, "");
    if (!/^\d+$/.test(intSection)) return null;
    const n = Number(`${intSection}.${dec}`);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
  }

  const lastDot = t.lastIndexOf(".");
  if (lastDot >= 0) {
    const after = t.slice(lastDot + 1);
    if (/^\d{1,2}$/.test(after)) {
      const before = t.slice(0, lastDot);
      const intPart = before.replace(/\./g, "");
      if (!/^\d+$/.test(intPart)) return null;
      const n = Number(`${intPart}.${after}`);
      if (!Number.isFinite(n) || n < 0) return null;
      return Math.round(n * 100);
    }
  }

  const intOnly = t.replace(/\./g, "");
  if (!/^\d+$/.test(intOnly)) return null;
  const n = Number(intOnly);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export const createMarketIntentSchema = z.object({
  kind: z.enum(["buy", "sell"]),
  stickerNumber: z.coerce.number().int().min(1).max(99_999),
  shippingScope: z.enum(["local_only", "national"]),
  currency: z.enum(MARKET_CURRENCY_CODES),
  priceMajor: z.string().min(1, "Indica un precio"),
});

export type CreateMarketIntentInput = z.infer<typeof createMarketIntentSchema>;

export function parseCreateMarketIntentWithCents(
  raw: unknown,
):
  | { ok: true; data: CreateMarketIntentInput & { priceCents: number } }
  | { ok: false; message: string } {
  const parsed = createMarketIntentSchema.safeParse(raw);
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
