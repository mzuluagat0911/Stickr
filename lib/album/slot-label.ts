import type { CatalogStickerDTO } from "@/lib/album/types";

/**
 * Número visible en la celda: por selección `MEX 1`…`MEX 20`; intro FWC y museo
 * siguen con el n.º global del álbum (1–20 y 981–990).
 */
export function catalogStickerDisplayLabel(s: CatalogStickerDTO): string {
  if (s.teamCode === "FWC" || s.teamCode === "MUSEUM") {
    return String(s.stickerNumber);
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
