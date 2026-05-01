import { createClient } from "@/lib/supabase/server";

/** Coleccionistas misma ciudad, ordenados por utilidad para intercambio (mis faltas/prioridades vs sus repetidas). */
export type SameCityCollector = {
  otherUserId: string;
  username: string;
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
};

type RpcRow = {
  other_user_id: string;
  username: string;
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
  return {
    otherUserId: r.other_user_id,
    username: r.username,
    albumPercent: num(r.album_percent),
    duplicateDistinct: Number(r.duplicate_distinct ?? 0),
    duplicatesForTrade: Number(r.duplicates_for_trade ?? 0),
    lastActiveAt: r.last_active_at,
    matchDistinctHelp: Number(r.match_distinct_help ?? 0),
    matchTradableQty: Number(r.match_tradable_qty ?? 0),
    wishlistOverlapDistinct: Number(r.wishlist_overlap_distinct ?? 0),
  };
}

/**
 * RPC `discover_collectors_exchange_ranked`: misma ciudad que el perfil + ranking
 * por cruces repetidas/faltantes. Requiere migración `0008_exchange_wants_and_discover_rank`.
 */
export async function discoverCollectorsSameCity(
  userId: string,
  limit = 100,
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
