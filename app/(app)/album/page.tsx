import { Database } from "lucide-react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/public-env";
import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";
import { AlbumGrid } from "@/components/album/album-grid";
import { EmptyState } from "@/components/ui/empty-state";

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

function toDTO(r: CatalogRow): CatalogStickerDTO {
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

export default async function AlbumPage() {
  if (!hasPublicSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("album_edition")
    .eq("id", user.id)
    .maybeSingle();

  const rawEdition = (profile?.album_edition as string | undefined) ?? "";
  const normalizedEdition = rawEdition.trim();
  const edition =
    normalizedEdition.length > 0 ? normalizedEdition : "PR-International";

  const { data: catalogRowsPrimary, error: cErrPrimary } = await supabase
    .from("sticker_catalog")
    .select(
      "id, sticker_number, team_code, position_in_team, type, player_name, player_position, image_url",
    )
    .eq("album_edition", edition)
    .order("sticker_number", { ascending: true });

  if (cErrPrimary) {
    throw new Error(cErrPrimary.message);
  }

  let catalogRows = catalogRowsPrimary ?? [];
  let resolvedEdition = edition;

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
    if ((fallbackRows ?? []).length > 0) {
      catalogRows = fallbackRows ?? [];
      resolvedEdition = "PR-International";
    }
  }

  const { data: stickerRows, error: uErr } = await supabase
    .from("user_stickers")
    .select("sticker_id, status, duplicate_count")
    .eq("user_id", user.id);

  if (uErr) {
    throw new Error(uErr.message);
  }

  const ewResult = await supabase
    .from("exchange_wants")
    .select("sticker_id")
    .eq("user_id", user.id);

  if (ewResult.error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[album] No se pudo leer exchange_wants (¿migración 0008 aplicada?).",
        ewResult.error.message,
      );
    }
  }

  const ewRows = ewResult.error ? null : ewResult.data;

  const catalog = (catalogRows ?? []).map((r) => toDTO(r as CatalogRow));

  const initialUserMap: UserStickerMapDTO = {};
  for (const r of stickerRows ?? []) {
    const st = r.status as string;
    if (st !== "have" && st !== "duplicate") continue;
    initialUserMap[r.sticker_id as string] = {
      status: st as "have" | "duplicate",
      duplicateCount: Number(r.duplicate_count ?? 0),
    };
  }

  if (catalog.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mi álbum</h1>
        <EmptyState
          icon={Database}
          title="El catálogo está vacío"
          description={`No hay figuritas para la edición ${resolvedEdition}. Con tu base local o Supabase ejecuta «pnpm seed:catalog» con una DATABASE_URL válida e intenta de nuevo.`}
        />
      </div>
    );
  }

  return (
    <AlbumGrid
      userId={user.id}
      edition={resolvedEdition}
      catalog={catalog}
      initialUserMap={initialUserMap}
      initialExchangeWantIds={(ewRows ?? [])
        .map((r) => r.sticker_id as string)
        .filter(Boolean)}
    />
  );
}
