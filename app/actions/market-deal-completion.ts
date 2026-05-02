"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/result";
import { fail, ok } from "@/lib/types/result";
import { conversationIdSchema } from "@/lib/validations/messages";
import {
  marketDealRatingSchema,
  marketDealReviewTextSchema,
} from "@/lib/validations/market-deal-completion";

type RpcJson = Record<string, unknown>;

export async function confirmMarketDealCompletionAction(
  conversationId: string,
): Promise<ActionResult<{ bothComplete: boolean }>> {
  const parsed = conversationIdSchema.safeParse(conversationId);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Conversación inválida.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const { data, error } = await supabase.rpc("confirm_market_deal_completion", {
    p_conversation_id: parsed.data,
  });

  if (error) {
    return fail(error.message);
  }

  const payload = (data ?? null) as RpcJson | null;
  if (payload?.now_complete === true && payload?.already_complete !== true) {
    await supabase.from("messages").insert({
      conversation_id: parsed.data,
      sender_id: user.id,
      content:
        "Ambas partes marcaron este acuerdo como completado en Stickr (pago/entrega fuera de la app).",
    });
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", parsed.data);
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${parsed.data}`);
  revalidatePath("/profile");

  const bothComplete =
    payload?.now_complete === true && payload?.already_complete !== true;

  return ok({ bothComplete });
}

export async function submitMarketDealReviewAction(
  conversationId: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = conversationIdSchema.safeParse(conversationId);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Conversación inválida.");
  }

  const ratingParsed = marketDealRatingSchema.safeParse(formData.get("rating"));
  if (!ratingParsed.success) {
    return fail(
      ratingParsed.error.issues[0]?.message ?? "Valoración inválida.",
    );
  }

  const textParsed = marketDealReviewTextSchema.safeParse(
    formData.get("reviewText"),
  );
  if (!textParsed.success) {
    return fail(textParsed.error.issues[0]?.message ?? "Texto inválido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const { error } = await supabase.rpc("submit_market_deal_review", {
    p_conversation_id: parsed.data,
    p_rating: ratingParsed.data,
    p_review_text: textParsed.data ?? "",
  });

  if (error) {
    return fail(error.message);
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${parsed.data}`);
  revalidatePath("/profile");
  return ok("Reseña publicada");
}
