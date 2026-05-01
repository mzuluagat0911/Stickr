"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { formatMinorCurrency } from "@/lib/format-currency";
import type { MarketFeedIntent } from "@/lib/marketplace/types";
import type { ActionResult } from "@/lib/types/result";
import { fail, ok } from "@/lib/types/result";
import { parseCreateMarketIntentWithCents } from "@/lib/validations/marketplace";

export type { MarketFeedIntent };

export async function createMarketIntentAction(
  formData: FormData,
): Promise<ActionResult<{ summary: string }>> {
  const raw = parseCreateMarketIntentWithCents({
    kind: formData.get("kind"),
    stickerNumber: formData.get("stickerNumber"),
    shippingScope: formData.get("shippingScope"),
    priceMajor: formData.get("priceMajor"),
    currency: formData.get("currency"),
  });
  if (!raw.ok) {
    return fail(raw.message);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const { data: profile, error: pErr } = await supabase
    .from("user_profiles")
    .select("album_edition")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr) {
    return fail(pErr.message);
  }

  const profileEdition = String(profile?.album_edition ?? "").trim();
  const edition = profileEdition || "PR-International";

  const { data: catRow, error: cErr } = await supabase
    .from("sticker_catalog")
    .select("id")
    .eq("album_edition", edition)
    .eq("sticker_number", raw.data.stickerNumber)
    .maybeSingle();

  if (cErr) {
    return fail(cErr.message);
  }
  let resolvedEdition = edition;
  let resolvedCatalogId = catRow?.id as string | undefined;

  if (!resolvedCatalogId && edition !== "PR-International") {
    const { data: fallbackRow, error: fallbackErr } = await supabase
      .from("sticker_catalog")
      .select("id")
      .eq("album_edition", "PR-International")
      .eq("sticker_number", raw.data.stickerNumber)
      .maybeSingle();
    if (fallbackErr) return fail(fallbackErr.message);
    if (fallbackRow?.id) {
      resolvedEdition = "PR-International";
      resolvedCatalogId = fallbackRow.id as string;
    }
  }

  if (!resolvedCatalogId) {
    return fail(
      `El número ${raw.data.stickerNumber} no existe en catálogo ${edition}. Verifica tu edición en Perfil o usa un número válido.`,
    );
  }
  const stickerId = resolvedCatalogId;

  const { error: insErr } = await supabase.from("market_intentions").insert({
    user_id: user.id,
    album_edition: resolvedEdition,
    sticker_number: raw.data.stickerNumber,
    sticker_id: stickerId,
    kind: raw.data.kind,
    shipping_scope: raw.data.shippingScope,
    price_cents: raw.data.priceCents,
    currency: raw.data.currency,
    status: "active",
    updated_at: new Date().toISOString(),
  });

  if (insErr) {
    if (insErr.code === "42501") {
      return fail(
        "No tienes permisos para publicar aún. En Supabase revisa RLS/policies de market_intentions (insert/update/select para usuarios autenticados).",
      );
    }
    if (insErr.code === "42P01") {
      return fail(
        "Falta la tabla market_intentions. Ejecuta la migración 0006_market_intentions en Supabase.",
      );
    }
    if (insErr.code === "23505") {
      return fail(
        "Ya tienes una publicación activa igual (misma figurita y tipo compra o venta). Cancélala antes desde el listado.",
      );
    }
    return fail(insErr.message);
  }

  revalidatePath("/marketplace");
  const scopeLabel =
    raw.data.shippingScope === "national"
      ? "con envío nacional"
      : "solo encuentro local";
  const priceLabel = formatMinorCurrency(
    raw.data.priceCents,
    raw.data.currency,
  );
  const summary =
    raw.data.kind === "buy"
      ? `Busco #${raw.data.stickerNumber} hasta ${priceLabel} (${scopeLabel})`
      : `Vendo #${raw.data.stickerNumber} desde ${priceLabel} (${scopeLabel})`;
  return ok({ summary });
}

export async function cancelMarketIntentAction(
  intentId: string,
): Promise<ActionResult> {
  const id = intentId.trim();
  if (!id || !/^[0-9a-f-]{36}$/iu.test(id)) {
    return fail("Identificador inválido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const { data: updated, error } = await supabase
    .from("market_intentions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .select("id");

  if (error) {
    return fail(error.message);
  }
  if (!updated?.length) {
    return fail("No encontramos una publicación activa tuya con ese código.");
  }

  revalidatePath("/marketplace");
  return ok("Publicación cancelada");
}
