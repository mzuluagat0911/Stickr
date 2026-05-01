import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";

export type TeamProgressSlice = {
  total: number;
  have: number;
  duplicateSlots: number;
  missing: number;
};

export type AlbumProgressStats = {
  total: number;
  have: number;
  /** Cantidad de figuritas distintas marcadas como repetida (estado duplicate) */
  duplicateStickers: number;
  /** Suma de ejemplares extra: cada fila duplicate suma max(0, duplicateCount - 1) */
  duplicateExtraCopies: number;
  missing: number;
  /** (have + duplicateStickers) / total — al menos una copia en cada casillero */
  percentCollected: number;
  byTeam: Record<string, TeamProgressSlice>;
  bar: { gray: number; green: number; gold: number };
};

function entryForSticker(
  stickerId: string,
  map: UserStickerMapDTO,
):
  | { kind: "missing" }
  | { kind: "have" }
  | { kind: "duplicate"; extra: number } {
  const row = map[stickerId];
  if (!row) {
    return { kind: "missing" };
  }
  if (row.status === "have") {
    return { kind: "have" };
  }
  const n = Math.max(2, row.duplicateCount || 2);
  return { kind: "duplicate", extra: n - 1 };
}

export function computeAlbumProgress(
  catalog: readonly CatalogStickerDTO[],
  map: UserStickerMapDTO,
): AlbumProgressStats {
  const total = catalog.length;
  let have = 0;
  let duplicateStickers = 0;
  let duplicateExtraCopies = 0;
  let missing = 0;

  const byTeam: Record<string, TeamProgressSlice> = {};

  for (const s of catalog) {
    if (!byTeam[s.teamCode]) {
      byTeam[s.teamCode] = {
        total: 0,
        have: 0,
        duplicateSlots: 0,
        missing: 0,
      };
    }
    const team = byTeam[s.teamCode];
    team.total += 1;

    const st = entryForSticker(s.id, map);
    if (st.kind === "missing") {
      missing += 1;
      team.missing += 1;
    } else if (st.kind === "have") {
      have += 1;
      team.have += 1;
    } else {
      duplicateStickers += 1;
      duplicateExtraCopies += st.extra;
      team.duplicateSlots += 1;
    }
  }

  const collected = have + duplicateStickers;
  const percentCollected = total > 0 ? collected / total : 0;
  /** Peso visual: verde = have, dorado = repetidas (1 unidad cada una), gris = falta */
  const green = total > 0 ? have / total : 0;
  const gold = total > 0 ? duplicateStickers / total : 0;
  const gray = total > 0 ? missing / total : 0;
  return {
    total,
    have,
    duplicateStickers,
    duplicateExtraCopies,
    missing,
    percentCollected,
    byTeam,
    bar: { gray, green, gold },
  };
}
