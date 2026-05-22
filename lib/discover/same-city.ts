import { createClient } from "@/lib/supabase/server";

/** Coleccionistas visibles en intercambio, ordenados por utilidad (prioriza tu ciudad). */
export type SameCityCollector = {
  otherUserId: string;
  username: string;
  /** Nombre para saludar (display_name o @username). */
  peerDisplayName: string;
  city: string;
  countryCode: string;
  isSameCity: boolean;
  albumPercent: number;
  /** Figuritas distintas marcadas como repetida */
  duplicateDistinct: number;
  /** Suma de ejemplares de más (duplicate_count − 1) para intercambiar */
  duplicatesForTrade: number;
  lastActiveAt: string | null;
  /** Figuritas distintas repetidas ellos que vos necesitás (falta explícita o prioridad sin tenerla). */
  matchDistinctHelp: number;
  /** Suma de ejemplares repetidos disponibles sobre esos cruces útiles. */
  matchTradableQty: number;
  /** Cruz entre prioridad marcada desde el álbum y repetidas disponibles ellos (desempata el ranking). */
  wishlistOverlapDistinct: number;
  /** E.164 si el peer tiene WhatsApp con visibilidad «Siempre». */
  whatsappE164: string | null;
  /** Tiene WhatsApp pero solo tras coordinar en chat (post_trade). */
  whatsappLocked: boolean;
};

type RpcRow = {
  other_user_id: string;
  username: string;
  city: string | null;
  country_code: string | null;
  is_same_city: boolean | null;
  album_percent: string | number | null;
  duplicate_distinct: number | null;
  duplicates_for_trade: number | null;
  last_active_at: string | null;
  match_distinct_help: number | null;
  match_tradable_qty: number | null;
  wishlist_overlap_distinct: number | null;
};

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapRow(r: RpcRow): SameCityCollector {
  const cityRaw = r.city;
  const city =
    typeof cityRaw === "string"
      ? cityRaw.trim()
      : cityRaw == null
        ? ""
        : String(cityRaw).trim();
  const countryRaw = r.country_code;
  const countryCode =
    typeof countryRaw === "string"
      ? countryRaw.trim().toUpperCase()
      : countryRaw == null
        ? ""
        : String(countryRaw).trim().toUpperCase();

  return {
    otherUserId: r.other_user_id,
    username: (r.username ?? "").trim() || "coleccionista",
    peerDisplayName: (r.username ?? "").trim() || "coleccionista",
    city,
    countryCode,
    isSameCity: Boolean(r.is_same_city),
    albumPercent: num(r.album_percent),
    duplicateDistinct: Number(r.duplicate_distinct ?? 0),
    duplicatesForTrade: Number(r.duplicates_for_trade ?? 0),
    lastActiveAt: r.last_active_at,
    matchDistinctHelp: Number(r.match_distinct_help ?? 0),
    matchTradableQty: Number(r.match_tradable_qty ?? 0),
    wishlistOverlapDistinct: Number(r.wishlist_overlap_distinct ?? 0),
    whatsappE164: null,
    whatsappLocked: false,
  };
}

/**
 * RPC `discover_collectors_exchange_ranked`: todos los coleccionistas visibles + ranking.
 * Requiere migraciones `0008` y `0023_discover_all_collectors_city`.
 */
export async function discoverCollectorsSameCity(
  userId: string,
  limit = 200,
): Promise<SameCityCollector[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "discover_collectors_exchange_ranked",
    {
      p_user_id: userId,
      p_limit: limit,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return (data as RpcRow[]).map(mapRow);
}
