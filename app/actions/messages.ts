"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
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
      revalidatePath("/messages");
      revalidatePath(`/messages/${again.id}`);
      return ok({ conversationId: again.id });
    }
  }

  return fail(insErr?.message ?? "No pudimos crear el hilo de mensajes.");
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

  const { error: mErr } = await supabase.from("messages").insert({
    conversation_id: convParsed.data,
    sender_id: user.id,
    content: msgParsed.data,
  });

  if (mErr) {
    return fail(mErr.message);
  }

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", convParsed.data);

  revalidatePath("/messages");
  revalidatePath(`/messages/${convParsed.data}`);
  return ok("Mensaje enviado");
}
