"use server";

import { createClient } from "@/lib/supabase/server";
import {
  parseExchangeOverlapDetail,
  type ExchangeOverlapDetailOk,
} from "@/lib/discover/exchange-overlap-detail";
import type { ActionResult } from "@/lib/types/result";
import { fail, ok } from "@/lib/types/result";
import { conversationIdSchema } from "@/lib/validations/messages";

const REASON_MESSAGES: Record<string, string> = {
  invalid_peer: "Usuario no válido.",
  peer_not_found: "No encontramos ese perfil.",
  not_visible:
    "No podés ver el detalle: revisá ciudad/país o que el álbum no sea privado.",
  edition_mismatch:
    "Usan distinta edición de álbum; los códigos no coinciden para listar cruces.",
};

export async function getExchangeOverlapDetailAction(
  peerUserId: string,
): Promise<ActionResult<ExchangeOverlapDetailOk>> {
  const parsed = conversationIdSchema.safeParse(peerUserId);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Identificador inválido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const { data: raw, error } = await supabase.rpc("exchange_overlap_detail", {
    p_peer_id: parsed.data,
  });

  if (error) {
    return fail(error.message);
  }

  const detail = parseExchangeOverlapDetail(raw);
  if (!detail) {
    return fail("Respuesta inválida del servidor.");
  }

  if (!detail.ok) {
    const msg =
      REASON_MESSAGES[detail.reason] ??
      "No se pudo cargar el detalle de intercambio.";
    if (detail.reason === "edition_mismatch") {
      return fail(
        `${msg} (vos: ${detail.yourEdition ?? "—"}, ellos: ${detail.theirEdition ?? "—"}).`,
      );
    }
    return fail(msg);
  }

  return ok(detail);
}
