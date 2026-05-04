import type { CatalogStickerDTO } from "@/lib/album/types";

/**
 * Etiqueta visible en la celda: `FWC 1`…`FWC 20`, `MEX 1`…`MEX 20`, `MUSEUM 1`…
 * (misma lógica Panini por ranura; el n.º global del catálogo sigue en datos/export).
 */
export function catalogStickerDisplayLabel(s: CatalogStickerDTO): string {
  if (s.teamCode === "FWC") {
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
