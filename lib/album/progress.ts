import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";

export type TeamProgressSlice = {
  total: number;
  have: number;
  duplicateSlots: number;
  /** Suma de (duplicateCount - 1) en casillas repetidas del equipo */
  duplicateExtraCopies: number;
  missing: number;
};

/** Intro FWC, selecciones o Museo: mismas reglas que el total del álbum. */
export type AlbumBlockRollup = {
  catalogTotal: number;
  /** Casillas con al menos una lámina (1 por casilla hacia el % del álbum). */
  slotsWithCopy: number;
  duplicateSlots: number;
  duplicateExtraCopies: number;
  /** Suma de `duplicateCount` en casillas «repetida» de este bloque (solo informativo). */
  physicalRepeatsInBlock: number;
};

export type AlbumProgressStats = {
  total: number;
  have: number;
  /** Cantidad de figuritas distintas marcadas como repetida (estado duplicate) */
  duplicateStickers: number;
  /** Suma de ejemplares extra: cada fila duplicate suma max(0, duplicateCount - 1) */
  duplicateExtraCopies: number;
  /**
   * Láminas físicas en estado repetida: suma de `duplicateCount` en esas casillas
   * (= duplicateStickers + duplicateExtraCopies). Solo informativo; no entra al %.
   */
  duplicatePhysicalRepeats: number;
  missing: number;
  /** Casillas con al menos una lámina (tengo o repetida). = intro + equipos + museo */
  slotsWithAtLeastOne: number;
  /**
   * Láminas físicas en tu poder: 1 por «tengo» + suma de cantidades en «repetida».
   * Informativo; el % del álbum usa solo `slotsWithAtLeastOne`.
   */
  physicalSheetsOwned: number;
  /** (have + duplicateStickers) / total — una casilla cuenta como mucho una vez */
  percentCollected: number;
  /** Suma de `slotsWithCopy` por bloque; debe coincidir con `slotsWithAtLeastOne`. */
  blocks: {
    introFwc: AlbumBlockRollup;
    nationalTeams: AlbumBlockRollup;
    museum: AlbumBlockRollup;
  };
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

function emptyBlockRollup(): AlbumBlockRollup {
  return {
    catalogTotal: 0,
    slotsWithCopy: 0,
    duplicateSlots: 0,
    duplicateExtraCopies: 0,
    physicalRepeatsInBlock: 0,
  };
}

function rollupAlbumBlocks(
  byTeam: Record<string, TeamProgressSlice>,
): AlbumProgressStats["blocks"] {
  const introFwc = emptyBlockRollup();
  const museum = emptyBlockRollup();
  const nationalTeams = emptyBlockRollup();

  for (const [code, t] of Object.entries(byTeam)) {
    const swc = t.have + t.duplicateSlots;
    const physRep = t.duplicateSlots + t.duplicateExtraCopies;
    if (code === "FWC") {
      introFwc.catalogTotal += t.total;
      introFwc.slotsWithCopy += swc;
      introFwc.duplicateSlots += t.duplicateSlots;
      introFwc.duplicateExtraCopies += t.duplicateExtraCopies;
      introFwc.physicalRepeatsInBlock += physRep;
    } else if (code === "MUSEUM") {
      museum.catalogTotal += t.total;
      museum.slotsWithCopy += swc;
      museum.duplicateSlots += t.duplicateSlots;
      museum.duplicateExtraCopies += t.duplicateExtraCopies;
      museum.physicalRepeatsInBlock += physRep;
    } else {
      nationalTeams.catalogTotal += t.total;
      nationalTeams.slotsWithCopy += swc;
      nationalTeams.duplicateSlots += t.duplicateSlots;
      nationalTeams.duplicateExtraCopies += t.duplicateExtraCopies;
      nationalTeams.physicalRepeatsInBlock += physRep;
    }
  }

  return { introFwc, nationalTeams, museum };
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
        duplicateExtraCopies: 0,
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
      team.duplicateExtraCopies += st.extra;
    }
  }

  const slotsWithAtLeastOne = have + duplicateStickers;
  const percentCollected = total > 0 ? slotsWithAtLeastOne / total : 0;
  const duplicatePhysicalRepeats = duplicateStickers + duplicateExtraCopies;
  const physicalSheetsOwned = have + duplicatePhysicalRepeats;
  const blocks = rollupAlbumBlocks(byTeam);

  const sumBlockCatalog =
    blocks.introFwc.catalogTotal +
    blocks.nationalTeams.catalogTotal +
    blocks.museum.catalogTotal;
  const sumBlockSlotsCopy =
    blocks.introFwc.slotsWithCopy +
    blocks.nationalTeams.slotsWithCopy +
    blocks.museum.slotsWithCopy;
  if (sumBlockCatalog !== total || sumBlockSlotsCopy !== slotsWithAtLeastOne) {
    throw new Error(
      [
        "[computeAlbumProgress] Invariante de sumas rota.",
        `catalog ${sumBlockCatalog} vs total ${total};`,
        `slotsCopy ${sumBlockSlotsCopy} vs slotsWithAtLeastOne ${slotsWithAtLeastOne}.`,
      ].join(" "),
    );
  }

  /** Peso visual por casilla: verde = tengo, dorado = repetida (1 por casilla), gris = falta */
  const green = total > 0 ? have / total : 0;
  const gold = total > 0 ? duplicateStickers / total : 0;
  const gray = total > 0 ? missing / total : 0;
  return {
    total,
    have,
    duplicateStickers,
    duplicateExtraCopies,
    duplicatePhysicalRepeats,
    missing,
    slotsWithAtLeastOne,
    physicalSheetsOwned,
    percentCollected,
    blocks,
    byTeam,
    bar: { gray, green, gold },
  };
}
