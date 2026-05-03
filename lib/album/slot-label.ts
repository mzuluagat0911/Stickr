import type { CatalogStickerDTO } from "@/lib/album/types";

/**
 * Etiqueta corta por casilla, alineada al álbum por selección Panini 2026:
 * 1 escudo, 13 figuritas de bloque «equipo» (la 1 es la grupal), luego 6 jugadores.
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

  if (
    s.positionInTeam >= 1 &&
    s.positionInTeam <= 13 &&
    s.type === "team_photo"
  ) {
    return s.positionInTeam === 1 ? "Grupal" : "Equipo";
  }

  if (s.type === "team_photo") return "Grupal";
  if (s.type === "special_gold" || s.type === "special_legendary")
    return "Especial";

  return s.playerPosition?.trim() || "Jugador";
}
