"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { parseExchangeOverlapDetail } from "@/lib/discover/exchange-overlap-detail";
import { buildDiscoverExchangeProposalMessage } from "@/lib/messages/exchange-proposal-message";
import { ACTIVE_MARKET_INTENTION_STATUS } from "@/lib/marketplace/phase3-states";
import type { ActionResult } from "@/lib/types/result";
import { fail, ok } from "@/lib/types/result";
import {
  conversationIdSchema,
  messageContentSchema,
} from "@/lib/validations/messages";

function orderedPair(a: string, b: string): { userA: string; userB: string } {
  return a < b ? { userA: a, userB: b } : { userA: b, userB: a };
}

async function ensureGeneralDirectConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  peerId: string,
): Promise<ActionResult<{ conversationId: string }>> {
  const { userA, userB } = orderedPair(userId, peerId);

  const { data: existing, error: findErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a", userA)
    .eq("user_b", userB)
    .is("market_intention_id", null)
    .maybeSingle();

  if (findErr) {
    return fail(findErr.message);
  }
  if (existing?.id && typeof existing.id === "string") {
    revalidatePath("/messages");
    revalidatePath(`/messages/${existing.id}`);
    return ok({ conversationId: existing.id });
  }

  const now = new Date().toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from("conversations")
    .insert({
      user_a: userA,
      user_b: userB,
      market_intention_id: null,
      created_at: now,
      last_message_at: now,
    })
    .select("id")
    .single();

  if (!insErr && inserted?.id && typeof inserted.id === "string") {
    revalidatePath("/messages");
    revalidatePath(`/messages/${inserted.id}`);
    return ok({ conversationId: inserted.id });
  }

  if (insErr?.code === "23505") {
    const { data: again } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", userA)
      .eq("user_b", userB)
      .is("market_intention_id", null)
      .maybeSingle();
    if (again?.id && typeof again.id === "string") {
      revalidatePath("/messages");
      revalidatePath(`/messages/${again.id}`);
      return ok({ conversationId: again.id });
    }
  }

  return fail(insErr?.message ?? "No pudimos abrir el chat.");
}

async function appendMessageToConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  senderId: string,
  rawBody: string,
): Promise<ActionResult> {
  const msgParsed = messageContentSchema.safeParse(rawBody);
  if (!msgParsed.success) {
    return fail(msgParsed.error.issues[0]?.message ?? "Mensaje inválido.");
  }

  const { error: mErr } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: msgParsed.data,
  });

  if (mErr) {
    return fail(mErr.message);
  }

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  return ok("Mensaje enviado");
}

/** Abre o reutiliza el hilo de mensajes ligado a una publicación activa del marketplace. */
export async function openMarketplaceThreadAction(
  marketIntentionId: string,
): Promise<ActionResult<{ conversationId: string }>> {
  const idParsed = conversationIdSchema.safeParse(marketIntentionId);
  if (!idParsed.success) {
    return fail(idParsed.error.issues[0]?.message ?? "Identificador inválido.");
  }
  const intentId = idParsed.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const { data: intent, error: iErr } = await supabase
    .from("market_intentions")
    .select("id,user_id,status")
    .eq("id", intentId)
    .maybeSingle();

  if (iErr) {
    return fail(iErr.message);
  }
  if (!intent || typeof intent.user_id !== "string") {
    return fail("No encontramos esa publicación.");
  }
  if (intent.status !== ACTIVE_MARKET_INTENTION_STATUS) {
    return fail("Esa publicación ya no está activa.");
  }
  if (intent.user_id === user.id) {
    return fail("No puedes abrir un hilo contigo mismo.");
  }

  const { userA, userB } = orderedPair(user.id, intent.user_id);

  const { data: existing, error: findErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a", userA)
    .eq("user_b", userB)
    .eq("market_intention_id", intentId)
    .maybeSingle();

  if (findErr) {
    return fail(findErr.message);
  }
  if (existing?.id && typeof existing.id === "string") {
    const { error: dealErr } = await supabase.from("market_deals").insert({
      conversation_id: existing.id,
      market_intention_id: intentId,
      status: "open",
    });
    if (dealErr && dealErr.code !== "23505" && dealErr.code !== "42P01") {
      console.warn("[openMarketplaceThread] market_deals:", dealErr.message);
    }
    revalidatePath("/messages");
    revalidatePath(`/messages/${existing.id}`);
    return ok({ conversationId: existing.id });
  }

  const now = new Date().toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from("conversations")
    .insert({
      user_a: userA,
      user_b: userB,
      market_intention_id: intentId,
      created_at: now,
      last_message_at: now,
    })
    .select("id")
    .single();

  if (!insErr && inserted?.id && typeof inserted.id === "string") {
    const { error: dealErr } = await supabase.from("market_deals").insert({
      conversation_id: inserted.id,
      market_intention_id: intentId,
      status: "open",
    });
    if (dealErr && dealErr.code !== "23505" && dealErr.code !== "42P01") {
      // 42P01: migración 0012 aún no aplicada; 23505: fila duplicada por carrera
      console.warn("[openMarketplaceThread] market_deals:", dealErr.message);
    }
    revalidatePath("/messages");
    revalidatePath(`/messages/${inserted.id}`);
    return ok({ conversationId: inserted.id });
  }

  if (insErr?.code === "23505") {
    const { data: again } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", userA)
      .eq("user_b", userB)
      .eq("market_intention_id", intentId)
      .maybeSingle();
    if (again?.id && typeof again.id === "string") {
      const { error: dealErr } = await supabase.from("market_deals").insert({
        conversation_id: again.id,
        market_intention_id: intentId,
        status: "open",
      });
      if (dealErr && dealErr.code !== "23505" && dealErr.code !== "42P01") {
        console.warn("[openMarketplaceThread] market_deals:", dealErr.message);
      }
      revalidatePath("/messages");
      revalidatePath(`/messages/${again.id}`);
      return ok({ conversationId: again.id });
    }
  }

  return fail(insErr?.message ?? "No pudimos crear el hilo de mensajes.");
}

/**
 * Abre o reutiliza el chat directo (sin publicación de marketplace) con otro usuario.
 * Un solo hilo general por par: `market_intention_id` es null.
 */
export async function openDirectConversationAction(
  otherUserId: string,
): Promise<ActionResult<{ conversationId: string }>> {
  const parsed = conversationIdSchema.safeParse(otherUserId);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Usuario inválido.");
  }
  const peerId = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return fail("Sesión no válida.");
  }
  if (peerId === user.id) {
    return fail("No puedes abrir un chat contigo mismo.");
  }

  const { data: peerExists, error: pErr } = await supabase.rpc(
    "user_profile_exists",
    { p_user_id: peerId },
  );

  if (pErr) {
    if (
      pErr.message.includes("user_profile_exists") ||
      pErr.message.includes("function") ||
      pErr.code === "42883"
    ) {
      return fail(
        "Falta aplicar la función user_profile_exists en Supabase (migración 0021_user_profile_exists.sql).",
      );
    }
    return fail(pErr.message);
  }
  if (peerExists !== true) {
    return fail("No encontramos a esa persona.");
  }

  return ensureGeneralDirectConversation(supabase, user.id, peerId);
}

/**
 * Desde Intercambio: abre el hilo y envía un primer mensaje con listas sugeridas
 * (solo si el chat aún no tiene mensajes).
 */
export async function openDiscoverExchangeProposalAction(
  peerUserId: string,
  peerUsernameRaw: string,
): Promise<ActionResult<{ conversationId: string; proposalSent: boolean }>> {
  const parsed = conversationIdSchema.safeParse(peerUserId);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Usuario inválido.");
  }
  const peerId = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return fail("Sesión no válida.");
  }
  if (peerId === user.id) {
    return fail("No puedes abrir un chat contigo mismo.");
  }

  const { data: peerExists, error: pErr } = await supabase.rpc(
    "user_profile_exists",
    { p_user_id: peerId },
  );

  if (pErr) {
    if (
      pErr.message.includes("user_profile_exists") ||
      pErr.message.includes("function") ||
      pErr.code === "42883"
    ) {
      return fail(
        "Falta aplicar la función user_profile_exists en Supabase (migración 0021_user_profile_exists.sql).",
      );
    }
    return fail(pErr.message);
  }
  if (peerExists !== true) {
    return fail("No encontramos a esa persona.");
  }

  const convRes = await ensureGeneralDirectConversation(
    supabase,
    user.id,
    peerId,
  );
  if (!convRes.ok) {
    return fail(convRes.message);
  }
  const conversationId = convRes.data.conversationId;

  const { data: meRow } = await supabase
    .from("user_profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const selfLabel =
    (typeof meRow?.display_name === "string"
      ? meRow.display_name.trim()
      : "") ||
    (typeof meRow?.username === "string" ? meRow.username.trim() : "") ||
    "Un coleccionista";

  const peerSlug = peerUsernameRaw.trim().replace(/^@/, "");

  const { data: overlapRaw, error: ovErr } = await supabase.rpc(
    "exchange_overlap_detail",
    { p_peer_id: peerId },
  );

  const overlapParsed = ovErr ? null : parseExchangeOverlapDetail(overlapRaw);

  const body = buildDiscoverExchangeProposalMessage({
    selfLabel,
    peerAtUsername: peerSlug ? `@${peerSlug}` : "@coleccionista",
    overlap: overlapParsed,
    overlapRpcFailed: Boolean(ovErr),
  });

  const { count, error: ctErr } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  if (ctErr) {
    return fail(ctErr.message);
  }

  const hasPrior = typeof count === "number" && count > 0;
  if (hasPrior) {
    revalidatePath(`/messages/${conversationId}`);
    return ok({ conversationId, proposalSent: false });
  }

  const sendRes = await appendMessageToConversation(
    supabase,
    conversationId,
    user.id,
    body,
  );
  if (!sendRes.ok) {
    return fail(sendRes.message);
  }

  const { error: notifyErr } = await supabase.rpc(
    "enqueue_trade_proposal_notification",
    {
      p_conversation_id: conversationId,
      p_recipient_id: peerId,
    },
  );
  if (notifyErr) {
    const missingFn =
      notifyErr.code === "42883" ||
      notifyErr.message.includes("enqueue_trade_proposal_notification");
    if (missingFn) {
      console.warn(
        "[openDiscoverExchangeProposalAction] Falta migración 0022_notifications_trade_proposal.sql:",
        notifyErr.message,
      );
    } else {
      console.warn(
        "[openDiscoverExchangeProposalAction] notify trade_proposed:",
        notifyErr.message,
      );
    }
  }

  return ok({ conversationId, proposalSent: true });
}

export async function sendMessageAction(
  conversationId: string,
  content: string,
): Promise<ActionResult> {
  const convParsed = conversationIdSchema.safeParse(conversationId);
  if (!convParsed.success) {
    return fail(
      convParsed.error.issues[0]?.message ?? "Conversación inválida.",
    );
  }
  const msgParsed = messageContentSchema.safeParse(content);
  if (!msgParsed.success) {
    return fail(msgParsed.error.issues[0]?.message ?? "Mensaje inválido.");
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
    .select("id,user_a,user_b")
    .eq("id", convParsed.data)
    .maybeSingle();

  if (cErr) {
    return fail(cErr.message);
  }
  if (!conv?.id || (conv.user_a !== user.id && conv.user_b !== user.id)) {
    return fail("No tienes acceso a esta conversación.");
  }

  return appendMessageToConversation(
    supabase,
    convParsed.data,
    user.id,
    msgParsed.data,
  );
}
