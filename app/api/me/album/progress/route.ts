import { NextResponse } from "next/server";

import { computeAlbumProgress } from "@/lib/album/progress";
import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("album_edition")
    .eq("id", user.id)
    .maybeSingle();

  const edition =
    (profile?.album_edition as string | undefined) ?? "PR-International";

  const { data: catalogRows, error: cErr } = await supabase
    .from("sticker_catalog")
    .select(
      "id, sticker_number, team_code, position_in_team, type, player_name, player_position, image_url",
    )
    .eq("album_edition", edition)
    .order("sticker_number", { ascending: true });

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  const { data: userRows, error: uErr } = await supabase
    .from("user_stickers")
    .select("sticker_id, status, duplicate_count")
    .eq("user_id", user.id);

  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  const catalog = (catalogRows ?? []).map((r) => toCatalogDto(r as CatalogRow));

  const map: UserStickerMapDTO = {};
  for (const r of userRows ?? []) {
    const st = r.status as string;
    if (st !== "have" && st !== "duplicate") continue;
    map[r.sticker_id as string] = {
      status: st as "have" | "duplicate",
      duplicateCount: Number(r.duplicate_count ?? 0),
    };
  }

  const p = computeAlbumProgress(catalog, map);

  const body = {
    total: p.total,
    have: p.have,
    duplicates: p.duplicateStickers,
    duplicateExtraCopies: p.duplicateExtraCopies,
    duplicatePhysicalRepeats: p.duplicatePhysicalRepeats,
    missing: p.missing,
    slotsWithAtLeastOne: p.slotsWithAtLeastOne,
    physicalSheetsOwned: p.physicalSheetsOwned,
    percent: p.percentCollected,
    blocks: p.blocks,
    byTeam: p.byTeam,
    bar: p.bar,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
