import { fwcIntroAlbumNumber } from "@/lib/album/slot-label";
import type { CatalogStickerDTO } from "@/lib/album/types";
import type { Confederation } from "@/scripts/data/teams-2026";
import {
  TEAMS_2026,
  WORLD_CUP_2026_ALBUM_GROUPS,
} from "@/scripts/data/teams-2026";

/** Igual que en el álbum: minúsculas y sin acentos para comparar búsqueda. */
export function normalizeAlbumSearchText(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const CONFEDERATION_SEARCH: Record<Confederation, string> = {
  UEFA: "uefa europa europe",
  CONMEBOL: "conmebol sudamerica suramerica sur america",
  AFC: "afc asia",
  CAF: "caf africa",
  CONCACAF: "concacaf norteamerica centroamerica caribe",
  OFC: "ofc oceania oceania",
};

/**
 * Sinónimos y nombres habituales en español (además del `name` en inglés del catálogo).
 * Valores en texto natural; se normalizan al construir el blob.
 */
const TEAM_SEARCH_ALIASES: Partial<Record<string, string>> = {
  ALG: "argelia",
  ARG: "argentina",
  AUS: "australia",
  AUT: "austria",
  BEL: "belgica bégica",
  BIH: "bosnia herzegovina",
  BRA: "brasil",
  CAN: "canada",
  COL: "colombia",
  CPV: "cabo verde",
  CIV: "costa de marfil marfil cote divoire",
  COD: "congo rdc",
  CRO: "croacia",
  CUW: "curazao",
  CZE: "chequia republica checa",
  ECU: "ecuador",
  EGY: "egipto",
  ENG: "inglaterra",
  ESP: "españa espana",
  FRA: "francia",
  GHA: "ghana",
  GER: "alemania deutschland",
  HAI: "haiti haití",
  IRN: "iran irán",
  IRQ: "irak",
  JOR: "jordania",
  JPN: "japon japón",
  KOR: "corea surcorea corea del sur",
  MAR: "marruecos",
  MEX: "mexico méxico",
  NED: "holanda paises bajos países bajos",
  NOR: "noruega",
  NZL: "nueva zelanda",
  PAN: "panama panamá",
  PAR: "paraguay",
  POR: "portugal",
  QAT: "catar qatar",
  RSA: "sudafrica sudáfrica",
  KSA: "arabia saudita arabia saudí",
  SCO: "escocia",
  SEN: "senegal",
  SUI: "suiza",
  SWE: "suecia",
  TUN: "tunez túnez",
  TUR: "turquia turquía",
  URU: "uruguay",
  USA: "estados unidos eeuu estados unidos de america",
  UZB: "uzbekistan uzbekistán",
};

const FWC_SEARCH_EXTRA =
  "fwc fifa world cup copa mundial torneo especiales especiales panini intro";

const MUSEUM_SEARCH_EXTRA =
  "museum museo historia campeones historicos legendary gold panini";

let cachedTeamBlobs: ReadonlyMap<string, string> | null = null;

function albumGroupSearchHint(teamCode: string): string {
  const up = teamCode.toUpperCase();
  for (const g of WORLD_CUP_2026_ALBUM_GROUPS) {
    if (g.teams.some((t) => t.code === up)) {
      return `grupo ${g.letter} group ${g.letter} fase grupos`;
    }
  }
  return "";
}

export function getTeamSearchBlobMap(): ReadonlyMap<string, string> {
  if (cachedTeamBlobs) return cachedTeamBlobs;
  const m = new Map<string, string>();
  for (const t of TEAMS_2026) {
    const aliases = TEAM_SEARCH_ALIASES[t.code] ?? "";
    const conf = CONFEDERATION_SEARCH[t.confederation];
    const groupHint = albumGroupSearchHint(t.code);
    const raw = [t.code, t.name, aliases, t.confederation, conf, groupHint]
      .filter(Boolean)
      .join(" ");
    m.set(t.code, normalizeAlbumSearchText(raw));
  }
  m.set("FWC", normalizeAlbumSearchText(`FWC ${FWC_SEARCH_EXTRA}`));
  m.set("MUSEUM", normalizeAlbumSearchText(`MUSEUM ${MUSEUM_SEARCH_EXTRA}`));
  cachedTeamBlobs = m;
  return m;
}

export function stickerMatchesAlbumSearch(
  sticker: CatalogStickerDTO,
  qRaw: string,
  teamBlobs: ReadonlyMap<string, string>,
): boolean {
  const q = normalizeAlbumSearchText(qRaw.trim());
  if (!q) return true;

  if (/^\d+$/.test(q)) {
    const n = Number(q);
    if (!Number.isFinite(n)) return false;
    if (sticker.teamCode === "FWC") {
      const panini = fwcIntroAlbumNumber(sticker.stickerNumber);
      if (panini !== null) {
        return panini === n;
      }
    }
    return sticker.stickerNumber === n;
  }

  const id = normalizeAlbumSearchText(sticker.id);
  const num = String(sticker.stickerNumber);
  const player = normalizeAlbumSearchText(sticker.playerName ?? "");
  const blob =
    teamBlobs.get(sticker.teamCode) ??
    normalizeAlbumSearchText(sticker.teamCode);

  return (
    id.includes(q) || num.includes(q) || player.includes(q) || blob.includes(q)
  );
}
