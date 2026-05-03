/**
 * Selecciones clasificadas al FIFA World Cup 2026 (48 equipos).
 *
 * `TEAMS_2026` sigue el **orden del álbum Panini FIFA World Cup 2026**
 * (checklist oficial en orden de páginas: checklistinsider.com / listado base
 * abril 2026). Grupos A→L con cuatro selecciones cada uno como en el libro;
 * las figuritas 21–980 del catálogo siguen esa secuencia (20 por equipo: 1 escudo,
 * 13 grupal, 2–12 y 14–20 jugadores; `id` tipo `MEX01`…`MEX20` en seed).
 *
 * `confederation` se conserva para datos y búsqueda; la UI del álbum agrupa por
 * **Grupo A–L**, no por confederación.
 */
export type Confederation =
  | "UEFA"
  | "CONMEBOL"
  | "AFC"
  | "CAF"
  | "CONCACAF"
  | "OFC";

export type Team2026 = {
  code: string;
  name: string;
  confederation: Confederation;
};

/**
 * Códigos FIFA por grupo en **orden Panini** (páginas del álbum, no orden FIFA
 * de sorteo). Fuente: checklist base 2026 «Listed in Album order».
 */
const WC2026_ALBUM_GROUP_CODES: readonly (readonly string[])[] = [
  ["MEX", "RSA", "KOR", "CZE"],
  ["CAN", "BIH", "QAT", "SUI"],
  ["BRA", "MAR", "HAI", "SCO"],
  ["USA", "PAR", "AUS", "TUR"],
  ["GER", "CUW", "CIV", "ECU"],
  ["NED", "JPN", "SWE", "TUN"],
  ["BEL", "EGY", "IRN", "NZL"],
  ["ESP", "CPV", "KSA", "URU"],
  ["FRA", "SEN", "IRQ", "NOR"],
  ["ARG", "ALG", "AUT", "JOR"],
  ["POR", "COD", "UZB", "COL"],
  ["ENG", "CRO", "GHA", "PAN"],
] as const;

const GROUP_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

const TEAMS_BY_CODE: Record<string, Team2026> = {
  ALG: { code: "ALG", name: "Argelia", confederation: "CAF" },
  ARG: { code: "ARG", name: "Argentina", confederation: "CONMEBOL" },
  AUS: { code: "AUS", name: "Australia", confederation: "AFC" },
  AUT: { code: "AUT", name: "Austria", confederation: "UEFA" },
  BEL: { code: "BEL", name: "Bélgica", confederation: "UEFA" },
  BIH: { code: "BIH", name: "Bosnia y Herzegovina", confederation: "UEFA" },
  BRA: { code: "BRA", name: "Brasil", confederation: "CONMEBOL" },
  CAN: { code: "CAN", name: "Canadá", confederation: "CONCACAF" },
  COL: { code: "COL", name: "Colombia", confederation: "CONMEBOL" },
  CPV: { code: "CPV", name: "Cabo Verde", confederation: "CAF" },
  CIV: { code: "CIV", name: "Costa de Marfil", confederation: "CAF" },
  COD: { code: "COD", name: "RD Congo", confederation: "CAF" },
  CRO: { code: "CRO", name: "Croacia", confederation: "UEFA" },
  CUW: { code: "CUW", name: "Curazao", confederation: "CONCACAF" },
  CZE: { code: "CZE", name: "Chequia", confederation: "UEFA" },
  ECU: { code: "ECU", name: "Ecuador", confederation: "CONMEBOL" },
  EGY: { code: "EGY", name: "Egipto", confederation: "CAF" },
  ENG: { code: "ENG", name: "Inglaterra", confederation: "UEFA" },
  ESP: { code: "ESP", name: "España", confederation: "UEFA" },
  FRA: { code: "FRA", name: "Francia", confederation: "UEFA" },
  GHA: { code: "GHA", name: "Ghana", confederation: "CAF" },
  GER: { code: "GER", name: "Alemania", confederation: "UEFA" },
  HAI: { code: "HAI", name: "Haití", confederation: "CONCACAF" },
  IRN: { code: "IRN", name: "Irán", confederation: "AFC" },
  IRQ: { code: "IRQ", name: "Irak", confederation: "AFC" },
  JOR: { code: "JOR", name: "Jordania", confederation: "AFC" },
  JPN: { code: "JPN", name: "Japón", confederation: "AFC" },
  KOR: { code: "KOR", name: "Corea del Sur", confederation: "AFC" },
  MAR: { code: "MAR", name: "Marruecos", confederation: "CAF" },
  MEX: { code: "MEX", name: "México", confederation: "CONCACAF" },
  NED: { code: "NED", name: "Países Bajos", confederation: "UEFA" },
  NOR: { code: "NOR", name: "Noruega", confederation: "UEFA" },
  NZL: { code: "NZL", name: "Nueva Zelanda", confederation: "OFC" },
  PAN: { code: "PAN", name: "Panamá", confederation: "CONCACAF" },
  PAR: { code: "PAR", name: "Paraguay", confederation: "CONMEBOL" },
  POR: { code: "POR", name: "Portugal", confederation: "UEFA" },
  QAT: { code: "QAT", name: "Catar", confederation: "AFC" },
  RSA: { code: "RSA", name: "Sudáfrica", confederation: "CAF" },
  KSA: { code: "KSA", name: "Arabia Saudita", confederation: "AFC" },
  SCO: { code: "SCO", name: "Escocia", confederation: "UEFA" },
  SEN: { code: "SEN", name: "Senegal", confederation: "CAF" },
  SUI: { code: "SUI", name: "Suiza", confederation: "UEFA" },
  SWE: { code: "SWE", name: "Suecia", confederation: "UEFA" },
  TUN: { code: "TUN", name: "Túnez", confederation: "CAF" },
  TUR: { code: "TUR", name: "Turquía", confederation: "UEFA" },
  URU: { code: "URU", name: "Uruguay", confederation: "CONMEBOL" },
  USA: { code: "USA", name: "Estados Unidos", confederation: "CONCACAF" },
  UZB: { code: "UZB", name: "Uzbekistán", confederation: "AFC" },
};

function buildAlbumTeamOrder(): Team2026[] {
  const out: Team2026[] = [];
  for (const row of WC2026_ALBUM_GROUP_CODES) {
    for (const code of row) {
      const t = TEAMS_BY_CODE[code];
      if (!t) {
        throw new Error(`teams-2026: código FIFA desconocido en draw: ${code}`);
      }
      out.push(t);
    }
  }
  return out;
}

/** Orden lineal del catálogo (figuritas 21–980): Grupo A → … → Grupo L. */
export const TEAMS_2026: Team2026[] = buildAlbumTeamOrder();

if (TEAMS_2026.length !== 48) {
  throw new Error(
    `TEAMS_2026 debe tener 48 equipos; tiene ${TEAMS_2026.length}`,
  );
}

/** Grupos A–L del álbum (orden Panini 2026). */
export const WORLD_CUP_2026_ALBUM_GROUPS: {
  letter: (typeof GROUP_LETTERS)[number];
  teams: Team2026[];
}[] = WC2026_ALBUM_GROUP_CODES.map((codes, i) => ({
  letter: GROUP_LETTERS[i]!,
  teams: codes.map((code) => TEAMS_BY_CODE[code]!),
}));

/** Mapa código FIFA → pestaña `group-X` del álbum. */
export function albumTabIdForTeamCode(teamCode: string): string | null {
  const up = teamCode.trim().toUpperCase();
  if (up === "FWC" || up === "MUSEUM") return null;
  for (const g of WORLD_CUP_2026_ALBUM_GROUPS) {
    if (g.teams.some((t) => t.code === up)) {
      return `group-${g.letter}`;
    }
  }
  return null;
}
