import {
  catalogSlotLabel,
  catalogStickerDisplayLabel,
} from "@/lib/album/slot-label";
import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";
import { fifaTeamFlagEmoji } from "@/lib/teams/fifa-country";
import { TEAMS_2026 } from "@/scripts/data/teams-2026";

function escapeCsvCell(cell: string): string {
  if (/[",\r\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

const TEAM_NAME_BY_CODE = new Map(
  TEAMS_2026.map((t) => [t.code, t.name] as const),
);

const SPECIAL_TEAM_LABEL: Record<string, string> = {
  FWC: "Intro FWC",
  MUSEUM: "Museo",
};

export type StickerExportCategory = "faltantes" | "tengo" | "repetidas";

const CATEGORY_HEADING: Record<StickerExportCategory, string> = {
  faltantes: "Me faltan",
  tengo: "Tengo",
  repetidas: "Repetidas",
};

function teamDisplayName(teamCode: string): string {
  const up = teamCode.toUpperCase();
  return SPECIAL_TEAM_LABEL[up] ?? TEAM_NAME_BY_CODE.get(up) ?? up;
}

function sortByNumber(rows: CatalogStickerDTO[]): CatalogStickerDTO[] {
  return [...rows].sort((a, b) => a.stickerNumber - b.stickerNumber);
}

function groupStickersByTeam(
  rows: CatalogStickerDTO[],
): { teamCode: string; stickers: CatalogStickerDTO[] }[] {
  const byTeam = new Map<string, CatalogStickerDTO[]>();
  for (const s of sortByNumber(rows)) {
    const key = s.teamCode.toUpperCase();
    if (!byTeam.has(key)) byTeam.set(key, []);
    byTeam.get(key)!.push(s);
  }
  return [...byTeam.entries()]
    .map(([teamCode, stickers]) => ({ teamCode, stickers }))
    .sort(
      (a, b) =>
        (a.stickers[0]?.stickerNumber ?? 0) -
        (b.stickers[0]?.stickerNumber ?? 0),
    );
}

function duplicateSuffix(
  stickerId: string,
  userMap: UserStickerMapDTO | undefined,
): string {
  const entry = userMap?.[stickerId];
  if (entry?.status !== "duplicate") return "";
  const n = entry.duplicateCount;
  if (n <= 2) return " ×2";
  return ` ×${n}`;
}

/**
 * Etiqueta de exportación alineada con el álbum Panini (misma que la UI).
 * Ej.: `ARG 5 · Jugador`, `FWC 00 · Intro`, `MEX 1 · Escudo`.
 * Si en el futuro `player_name` viene cargado en catálogo, se añade al final.
 */
export function stickerExportLine(
  s: CatalogStickerDTO,
  userMap?: UserStickerMapDTO,
): string {
  const panini = catalogStickerDisplayLabel(s);
  const slot = catalogSlotLabel(s);
  const qty = duplicateSuffix(s.id, userMap);
  const player = s.playerName?.trim();
  const parts = [panini, slot];
  if (player) parts.push(player);
  return `${parts.join(" · ")}${qty}`;
}

export function listMissingStickers(
  catalog: CatalogStickerDTO[],
  map: UserStickerMapDTO,
): CatalogStickerDTO[] {
  return catalog.filter((s) => !map[s.id]);
}

export function listHaveStickers(
  catalog: CatalogStickerDTO[],
  map: UserStickerMapDTO,
): CatalogStickerDTO[] {
  return catalog.filter((s) => map[s.id]?.status === "have");
}

export function listDuplicateStickers(
  catalog: CatalogStickerDTO[],
  map: UserStickerMapDTO,
): CatalogStickerDTO[] {
  return catalog.filter((s) => map[s.id]?.status === "duplicate");
}

/** Una línea por figurita, agrupada por país/equipo con bandera (ideal para pegar en WhatsApp). */
export function formatStickersWhatsApp(
  rows: CatalogStickerDTO[],
  category: StickerExportCategory,
  options?: { edition?: string; userMap?: UserStickerMapDTO },
): string {
  if (rows.length === 0) return "";

  const heading = CATEGORY_HEADING[category];
  const count = rows.length;
  const edition = options?.edition?.trim();
  const headerParts = [
    `📋 Stickr · ${heading} ${count} figurita${count === 1 ? "" : "s"}`,
  ];
  if (edition) headerParts.push(`(${edition})`);

  const blocks: string[] = [headerParts.join(" "), ""];

  for (const { teamCode, stickers } of groupStickersByTeam(rows)) {
    const flag = fifaTeamFlagEmoji(teamCode);
    const name = teamDisplayName(teamCode);
    blocks.push(`${flag} ${name}`);
    for (const s of stickers) {
      blocks.push(stickerExportLine(s, options?.userMap));
    }
    blocks.push("");
  }

  while (blocks.length > 0 && blocks[blocks.length - 1] === "") {
    blocks.pop();
  }
  return blocks.join("\n");
}

/** Lista compacta con etiqueta Panini por país (mensaje corto para WhatsApp). */
export function formatStickerNumbersWhatsApp(
  rows: CatalogStickerDTO[],
): string {
  if (rows.length === 0) return "";
  const lines: string[] = [];
  for (const { teamCode, stickers } of groupStickersByTeam(rows)) {
    const flag = fifaTeamFlagEmoji(teamCode);
    const labels = stickers
      .map((s) => catalogStickerDisplayLabel(s))
      .join(", ");
    lines.push(`${flag} ${labels}`);
  }
  return lines.join("\n");
}

export function formatStickersTxt(
  rows: CatalogStickerDTO[],
  category: StickerExportCategory,
  options?: { edition?: string; userMap?: UserStickerMapDTO },
): string {
  return formatStickersWhatsApp(rows, category, options);
}

export function formatMissingDetailLines(rows: CatalogStickerDTO[]): string {
  return formatStickersWhatsApp(rows, "faltantes");
}

export function formatMissingNumbersOnly(rows: CatalogStickerDTO[]): string {
  return formatStickerNumbersWhatsApp(rows);
}

export function formatMissingCsv(rows: CatalogStickerDTO[]): string {
  const header =
    "numero_catalogo,etiqueta_album,tipo_casilla,equipo,bandera,nombre_equipo,codigo_figurita";
  const sorted = sortByNumber(rows);
  const lines = sorted.map((s) =>
    [
      String(s.stickerNumber),
      catalogStickerDisplayLabel(s),
      catalogSlotLabel(s),
      s.teamCode,
      fifaTeamFlagEmoji(s.teamCode),
      teamDisplayName(s.teamCode),
      s.id,
    ]
      .map((c) => escapeCsvCell(String(c)))
      .join(","),
  );
  return [header, ...lines].join("\n");
}

export function formatStickersCsv(rows: CatalogStickerDTO[]): string {
  return formatMissingCsv(rows);
}
