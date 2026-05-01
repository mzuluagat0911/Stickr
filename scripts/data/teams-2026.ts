/**
 * Selecciones clasificadas al FIFA World Cup 2026 (48 equipos: 3 anfitriones + 45).
 * Fuente consolidada (abril 2026): anfitriones + listados tipo ESPN/FIFA tras repechajes.
 *
 * TODO: Si FIFA publica un orden oficial distinto para el álbum Panini, reordenar
 * TEAMS_2026 o añadir un campo `paniniOrder` y usarlo en seed-catalog.ts.
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

/** Orden alfabético por código FIFA (3 letras) para reproducibilidad del seed. */
export const TEAMS_2026: Team2026[] = [
  { code: "ALG", name: "Algeria", confederation: "CAF" },
  { code: "ARG", name: "Argentina", confederation: "CONMEBOL" },
  { code: "AUS", name: "Australia", confederation: "AFC" },
  { code: "AUT", name: "Austria", confederation: "UEFA" },
  { code: "BEL", name: "Belgium", confederation: "UEFA" },
  { code: "BIH", name: "Bosnia and Herzegovina", confederation: "UEFA" },
  { code: "BRA", name: "Brazil", confederation: "CONMEBOL" },
  { code: "CAN", name: "Canada", confederation: "CONCACAF" },
  { code: "COL", name: "Colombia", confederation: "CONMEBOL" },
  { code: "CPV", name: "Cape Verde", confederation: "CAF" },
  { code: "CIV", name: "Côte d'Ivoire", confederation: "CAF" },
  { code: "COD", name: "DR Congo", confederation: "CAF" },
  { code: "CRO", name: "Croatia", confederation: "UEFA" },
  { code: "CUW", name: "Curaçao", confederation: "CONCACAF" },
  { code: "CZE", name: "Czechia", confederation: "UEFA" },
  { code: "ECU", name: "Ecuador", confederation: "CONMEBOL" },
  { code: "EGY", name: "Egypt", confederation: "CAF" },
  { code: "ENG", name: "England", confederation: "UEFA" },
  { code: "ESP", name: "Spain", confederation: "UEFA" },
  { code: "FRA", name: "France", confederation: "UEFA" },
  { code: "GHA", name: "Ghana", confederation: "CAF" },
  { code: "GER", name: "Germany", confederation: "UEFA" },
  { code: "HAI", name: "Haiti", confederation: "CONCACAF" },
  { code: "IRN", name: "IR Iran", confederation: "AFC" },
  { code: "IRQ", name: "Iraq", confederation: "AFC" },
  { code: "JOR", name: "Jordan", confederation: "AFC" },
  { code: "JPN", name: "Japan", confederation: "AFC" },
  { code: "KOR", name: "Korea Republic", confederation: "AFC" },
  { code: "MAR", name: "Morocco", confederation: "CAF" },
  { code: "MEX", name: "Mexico", confederation: "CONCACAF" },
  { code: "NED", name: "Netherlands", confederation: "UEFA" },
  { code: "NOR", name: "Norway", confederation: "UEFA" },
  { code: "NZL", name: "New Zealand", confederation: "OFC" },
  { code: "PAN", name: "Panama", confederation: "CONCACAF" },
  { code: "PAR", name: "Paraguay", confederation: "CONMEBOL" },
  { code: "POR", name: "Portugal", confederation: "UEFA" },
  { code: "QAT", name: "Qatar", confederation: "AFC" },
  { code: "RSA", name: "South Africa", confederation: "CAF" },
  { code: "KSA", name: "Saudi Arabia", confederation: "AFC" },
  { code: "SCO", name: "Scotland", confederation: "UEFA" },
  { code: "SEN", name: "Senegal", confederation: "CAF" },
  { code: "SUI", name: "Switzerland", confederation: "UEFA" },
  { code: "SWE", name: "Sweden", confederation: "UEFA" },
  { code: "TUN", name: "Tunisia", confederation: "CAF" },
  { code: "TUR", name: "Türkiye", confederation: "UEFA" },
  { code: "URU", name: "Uruguay", confederation: "CONMEBOL" },
  { code: "USA", name: "USA", confederation: "CONCACAF" },
  { code: "UZB", name: "Uzbekistan", confederation: "AFC" },
];
