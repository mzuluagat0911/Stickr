"use server";

import { redirect } from "next/navigation";

import {
  cancelMarketIntentAction,
  createMarketIntentAction,
} from "@/app/actions/marketplace";
import { openMarketplaceThreadAction } from "@/app/actions/messages";

const FLASH_ERR_MAX = 450;

function redirectMarketError(message: string) {
  const m =
    message.trim().length > 0
      ? message.trim().slice(0, FLASH_ERR_MAX)
      : "Algo salió mal.";
  redirect(`/marketplace?err=${encodeURIComponent(m)}#publicar`);
}

/** Formulario HTML → publicar intención (compra o venta); resultado vía query en `/marketplace`. */
export async function marketplaceSubmitIntentFormAction(formData: FormData) {
  const res = await createMarketIntentAction(formData);
  if (res.ok) {
    redirect("/marketplace?ok=1#ofertas");
  }
  redirectMarketError(res.message);
}

/** Formulario con campo oculto `intentId`. */
export async function marketplaceCancelIntentFormAction(formData: FormData) {
  const intentId = String(formData.get("intentId") ?? "").trim();
  const res = await cancelMarketIntentAction(intentId);
  if (res.ok) {
    redirect("/marketplace?cancelled=1#ofertas");
  }
  redirectMarketError(res.message);
}

/** Formulario con `intentId` → abre o reutiliza hilo de mensajes. */
export async function marketplaceOpenThreadFormAction(formData: FormData) {
  const intentId = String(formData.get("intentId") ?? "").trim();
  const res = await openMarketplaceThreadAction(intentId);
  if (res.ok && res.data?.conversationId) {
    redirect(`/messages/${res.data.conversationId}`);
  }
  if (!res.ok) {
    redirectMarketError(res.message);
  }
  redirectMarketError("No pudimos abrir el chat.");
}
