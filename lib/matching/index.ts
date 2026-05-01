import { createClient } from "@/lib/supabase/server";

export type Match = {
  otherUserId: string;
  username: string;
  distanceKm: number;
  theyHaveINeed: number;
  iHaveTheyNeed: number;
  matchScore: number;
  lastActiveAt: string;
};

type FindMatchesRpcRow = {
  other_user_id: string;
  username: string;
  distance_km: string | number;
  they_have_i_need: number;
  i_have_they_need: number;
  match_score: string | number;
  last_active_at: string;
};

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapRow(r: FindMatchesRpcRow): Match {
  return {
    otherUserId: r.other_user_id,
    username: r.username,
    distanceKm: toNumber(r.distance_km),
    theyHaveINeed: Number(r.they_have_i_need ?? 0),
    iHaveTheyNeed: Number(r.i_have_they_need ?? 0),
    matchScore: toNumber(r.match_score),
    lastActiveAt: r.last_active_at,
  };
}

/**
 * Ejecuta la RPC `find_matches` con la sesión actual (debe coincidir `userId` con `auth.uid()`).
 * Solo servidor (Supabase cookies).
 */
export async function findMatchesForUser(
  userId: string,
  maxDistanceKm = 50,
  limit = 50,
): Promise<Match[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_matches", {
    p_user_id: userId,
    p_max_distance_km: maxDistanceKm,
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return (data as FindMatchesRpcRow[]).map(mapRow);
}
