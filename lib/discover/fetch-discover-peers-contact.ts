import { z } from "zod";

import type { DiscoverPeerContactInfo } from "@/lib/discover/peer-contact-types";
import { createClient } from "@/lib/supabase/server";

const rowSchema = z
  .object({
    peer_id: z.string().min(1).optional(),
    peerId: z.string().min(1).optional(),
    whatsapp: z.string().min(1).optional(),
    whatsapp_locked: z.boolean().optional(),
  })
  .transform((r) => ({
    peerId: (r.peer_id ?? r.peerId ?? "").trim(),
    whatsapp: r.whatsapp?.trim(),
    whatsappLocked: Boolean(r.whatsapp_locked) && !r.whatsapp,
  }));

export async function fetchDiscoverPeersContact(
  peerIds: string[],
): Promise<Map<string, DiscoverPeerContactInfo>> {
  const map = new Map<string, DiscoverPeerContactInfo>();
  const unique = [...new Set(peerIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_discover_peers_contact", {
    p_peer_ids: unique,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = normalizeRpcRows(data);

  for (const raw of rows) {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.peerId) continue;
    const { peerId, whatsapp, whatsappLocked } = parsed.data;
    map.set(peerId, {
      whatsappE164: whatsapp ?? null,
      whatsappLocked,
    });
  }

  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, { whatsappE164: null, whatsappLocked: false });
    }
  }

  return map;
}

/** PostgREST puede devolver jsonb como array o, en algunos casos, como string JSON. */
function normalizeRpcRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
