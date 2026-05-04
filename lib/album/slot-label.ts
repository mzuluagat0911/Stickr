import type { CatalogStickerDTO } from "@/lib/album/types";

/** Bloque intro FWC en catálogo: `sticker_number` 1–20 = álbum Panini FWC 00 + FWC 1–19. */
export const FWC_INTRO_CATALOG_MIN = 1;
export const FWC_INTRO_CATALOG_MAX = 20;

/**
 * Número impreso en el álbum (0 = FWC 00, 1–19 = FWC 1–19) para intro FWC.
 */
export function fwcIntroAlbumNumber(stickerNumber: number): number | null {
  if (
    stickerNumber < FWC_INTRO_CATALOG_MIN ||
    stickerNumber > FWC_INTRO_CATALOG_MAX
  ) {
    return null;
  }
  return stickerNumber === 1 ? 0 : stickerNumber - 1;
}

/**
 * Etiqueta visible en la celda: intro FWC `FWC 00` + `FWC 1`…`FWC 19` (catálogo 1–20),
 * `MEX 1`…`MEX 20`, `MUSEUM 1`… (el n.º global del catálogo sigue en datos/export).
 */
export function catalogStickerDisplayLabel(s: CatalogStickerDTO): string {
  if (s.teamCode === "FWC") {
    const album = fwcIntroAlbumNumber(s.stickerNumber);
    if (album !== null) {
      return album === 0 ? "FWC 00" : `FWC ${album}`;
    }
    return `FWC ${s.stickerNumber}`;
  }
  if (s.teamCode === "MUSEUM") {
    return `MUSEUM ${s.positionInTeam + 1}`;
  }
  const slot = s.positionInTeam + 1;
  return `${s.teamCode} ${slot}`;
}

/**
 * Etiqueta corta por tipo de casilla (Escudo / Grupal / Jugador / …).
 */
export function catalogSlotLabel(s: CatalogStickerDTO): string {
  if (s.type === "team_crest") return "Escudo";

  if (s.teamCode === "FWC") {
    if (s.type === "team_photo") return "Grupal";
    if (s.type === "special_gold" || s.type === "special_legendary")
      return "Especial";
    if (s.type === "regular") return "Intro";
  }

  if (s.teamCode === "MUSEUM") return "Museo";

  if (s.type === "team_photo") return "Grupal";
  if (s.type === "special_gold" || s.type === "special_legendary")
    return "Especial";

  return s.playerPosition?.trim() || "Jugador";
}
