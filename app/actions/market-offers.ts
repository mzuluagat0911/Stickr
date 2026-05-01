"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { formatMinorCurrency } from "@/lib/format-currency";
import type { ActionResult } from "@/lib/types/result";
import { fail, ok } from "@/lib/types/result";
import { conversationIdSchema } from "@/lib/validations/messages";
import { parseProposeMarketOffer } from "@/lib/validations/market-offers";

function offerIdSchema(id: string) {
  return conversationIdSchema.safeParse(id);
}

export async function proposeMarketOfferAction(
  conversationId: string,
  formData: FormData,
): Promise<ActionResult<{ offerId: string }>> {
  const convParsed = conversationIdSchema.safeParse(conversationId);
  if (!convParsed.success) {
    return fail(
      convParsed.error.issues[0]?.message ?? "Conversación inválida.",
    );
  }

  const raw = parseProposeMarketOffer({
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

  const { data: conv, error: cErr } = await supabase
    .from("conversations")
    .select("id,user_a,user_b,market_intention_id")
    .eq("id", convParsed.data)
    .maybeSingle();

  if (cErr || !conv?.id) {
    return fail("No encontramos la conversación.");
  }
  if (conv.user_a !== user.id && conv.user_b !== user.id) {
    return fail("No tienes acceso a esta conversación.");
  }
  if (
    !conv.market_intention_id ||
    typeof conv.market_intention_id !== "string"
  ) {
    return fail("Las ofertas de precio solo aplican a hilos de compra/venta.");
  }

  const peer = conv.user_a === user.id ? conv.user_b : conv.user_a;

  const { data: pending } = await supabase
    .from("market_offers")
    .select("id")
    .eq("conversation_id", convParsed.data)
    .eq("status", "pending")
    .maybeSingle();

  const parentOfferId =
    pending?.id && typeof pending.id === "string" ? pending.id : null;

  const now = new Date().toISOString();

  await supabase
    .from("market_offers")
    .update({ status: "superseded", responded_at: now })
    .eq("conversation_id", convParsed.data)
    .eq("status", "pending");

  const { data: inserted, error: insErr } = await supabase
    .from("market_offers")
    .insert({
      conversation_id: convParsed.data,
      market_intention_id: conv.market_intention_id,
      from_user_id: user.id,
      to_user_id: peer,
      price_cents: raw.data.priceCents,
      currency: raw.data.currency,
      status: "pending",
      parent_offer_id: parentOfferId,
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id || typeof inserted.id !== "string") {
    return fail(insErr?.message ?? "No pudimos registrar la oferta.");
  }

  const line = `Propongo ${formatMinorCurrency(raw.data.priceCents, raw.data.currency)}.`;
  await supabase.from("messages").insert({
    conversation_id: convParsed.data,
    sender_id: user.id,
    content: line,
  });

  await supabase
    .from("conversations")
    .update({ last_message_at: now })
    .eq("id", convParsed.data);

  revalidatePath("/messages");
  revalidatePath(`/messages/${convParsed.data}`);
  return ok({ offerId: inserted.id });
}

export async function respondToMarketOfferAction(
  offerId: string,
  decision: "accepted" | "rejected",
): Promise<ActionResult> {
  const idParsed = offerIdSchema(offerId);
  if (!idParsed.success) {
    return fail(idParsed.error.issues[0]?.message ?? "Oferta inválida.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const { data: off, error: oErr } = await supabase
    .from("market_offers")
    .select(
      "id,conversation_id,to_user_id,status,price_cents,currency,from_user_id",
    )
    .eq("id", idParsed.data)
    .maybeSingle();

  if (oErr || !off?.id) {
    return fail("No encontramos esa oferta.");
  }
  if (off.to_user_id !== user.id) {
    return fail("Solo quien recibe la oferta puede responderla.");
  }
  if (off.status !== "pending") {
    return fail("Esa oferta ya no está pendiente.");
  }

  const now = new Date().toISOString();
  const { error: uErr } = await supabase
    .from("market_offers")
    .update({
      status: decision,
      responded_at: now,
    })
    .eq("id", idParsed.data)
    .eq("status", "pending");

  if (uErr) {
    return fail(uErr.message);
  }

  const label = formatMinorCurrency(
    Number(off.price_cents),
    typeof off.currency === "string" ? off.currency : "ARS",
  );
  const line =
    decision === "accepted"
      ? `Acepté la oferta de ${label}.`
      : `Rechacé la oferta de ${label}.`;

  await supabase.from("messages").insert({
    conversation_id: off.conversation_id,
    sender_id: user.id,
    content: line,
  });

  await supabase
    .from("conversations")
    .update({ last_message_at: now })
    .eq("id", off.conversation_id);

  revalidatePath("/messages");
  revalidatePath(`/messages/${off.conversation_id}`);
  return ok(decision === "accepted" ? "Oferta aceptada" : "Oferta rechazada");
}
