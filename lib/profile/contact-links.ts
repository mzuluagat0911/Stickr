import { z } from "zod";

/** Salida de la RPC `get_conversation_peer_contact` (solo canales visibles). */
export type ConversationPeerContact = {
  whatsapp?: string;
  telegram?: string;
  email?: string;
  preferred?: "whatsapp" | "telegram" | "email";
};

const peerContactSchema = z
  .object({
    whatsapp: z.string().min(1).optional(),
    telegram: z.string().min(1).optional(),
    email: z.string().email().optional(),
    preferred: z.enum(["whatsapp", "telegram", "email"]).optional(),
  })
  .strict();

export function parseConversationPeerContact(
  raw: unknown,
): ConversationPeerContact | null {
  if (raw === null || raw === undefined) return null;
  const parsed = peerContactSchema.safeParse(raw);
  if (!parsed.success) return null;
  const d = parsed.data;
  if (!d.whatsapp && !d.telegram && !d.email) return null;
  return d;
}

/** Dígitos para wa.me (sin +). */
export function whatsAppDigits(e164OrNational: string): string {
  return e164OrNational.replace(/\D/g, "");
}

export function whatsAppHref(
  e164OrNational: string,
  prefillText?: string,
): string | null {
  const digits = whatsAppDigits(e164OrNational);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  const text = prefillText?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function telegramHref(usernameWithoutAt: string): string | null {
  const u = usernameWithoutAt.trim().replace(/^@+/, "");
  if (!u) return null;
  return `https://t.me/${encodeURIComponent(u)}`;
}

export function mailtoHref(address: string): string | null {
  const a = address.trim();
  if (!a) return null;
  return `mailto:${encodeURIComponent(a)}`;
}
