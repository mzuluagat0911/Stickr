import {
  computeAlbumProgress,
  type AlbumProgressStats,
} from "@/lib/album/progress";
import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type CatalogRow = {
  id: string;
  sticker_number: number;
  team_code: string;
  position_in_team: number;
  type: string;
  player_name: string | null;
  player_position: string | null;
  image_url: string | null;
};

function toCatalogDto(r: CatalogRow): CatalogStickerDTO {
  return {
    id: r.id,
    stickerNumber: r.sticker_number,
    teamCode: r.team_code,
    positionInTeam: r.position_in_team,
    type: r.type,
    playerName: r.player_name,
    playerPosition: r.player_position,
    imageUrl: r.image_url,
  };
}

/**
 * Progreso del álbum del usuario (misma lógica que /album y /api/me/album/progress).
 */
export async function loadUserAlbumProgress(
  supabase: SupabaseClient,
  userId: string,
  albumEdition: string,
): Promise<AlbumProgressStats | null> {
  const normalized = albumEdition.trim();
  const edition = normalized.length > 0 ? normalized : "PR-International";

  const { data: catalogRowsPrimary, error: cErr } = await supabase
    .from("sticker_catalog")
    .select(
      "id, sticker_number, team_code, position_in_team, type, player_name, player_position, image_url",
    )
    .eq("album_edition", edition)
    .order("sticker_number", { ascending: true });

  if (cErr) {
    throw new Error(cErr.message);
  }

  let catalogRows = catalogRowsPrimary ?? [];

  if (catalogRows.length === 0 && edition !== "PR-International") {
    const { data: fallbackRows, error: fallbackErr } = await supabase
      .from("sticker_catalog")
      .select(
        "id, sticker_number, team_code, position_in_team, type, player_name, player_position, image_url",
      )
      .eq("album_edition", "PR-International")
      .order("sticker_number", { ascending: true });
    if (fallbackErr) {
      throw new Error(fallbackErr.message);
    }
    catalogRows = fallbackRows ?? [];
  }

  if (catalogRows.length === 0) {
    return null;
  }

  const { data: stickerRows, error: uErr } = await supabase
    .from("user_stickers")
    .select("sticker_id, status, duplicate_count")
    .eq("user_id", userId);

  if (uErr) {
    throw new Error(uErr.message);
  }

  const catalog = catalogRows.map((r) => toCatalogDto(r as CatalogRow));
  const map: UserStickerMapDTO = {};
  for (const r of stickerRows ?? []) {
    const st = r.status as string;
    if (st !== "have" && st !== "duplicate") continue;
    map[r.sticker_id as string] = {
      status: st as "have" | "duplicate",
      duplicateCount: Number(r.duplicate_count ?? 0),
    };
  }

  return computeAlbumProgress(catalog, map);
}
