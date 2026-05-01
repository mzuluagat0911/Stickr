import type { CatalogStickerDTO, UserStickerMapDTO } from "@/lib/album/types";

function escapeCsvCell(cell: string): string {
  if (/[",\r\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function listMissingStickers(
  catalog: CatalogStickerDTO[],
  map: UserStickerMapDTO,
): CatalogStickerDTO[] {
  return catalog.filter((s) => !map[s.id]);
}

export function formatMissingDetailLines(rows: CatalogStickerDTO[]): string {
  return rows
    .slice()
    .sort((a, b) => a.stickerNumber - b.stickerNumber)
    .map((s) => {
      const name = (s.playerName ?? s.type ?? "").trim();
      const line = `#${s.stickerNumber} ${s.teamCode} ${name}`.trim();
      return line.replace(/\s+/g, " ");
    })
    .join("\n");
}

export function formatMissingNumbersOnly(rows: CatalogStickerDTO[]): string {
  return [...rows]
    .sort((a, b) => a.stickerNumber - b.stickerNumber)
    .map((s) => String(s.stickerNumber))
    .join(", ");
}

export function formatMissingCsv(rows: CatalogStickerDTO[]): string {
  const header = "numero,equipo,jugador_o_tipo,codigo_figurita";
  const sorted = [...rows].sort((a, b) => a.stickerNumber - b.stickerNumber);
  const lines = sorted.map((s) =>
    [String(s.stickerNumber), s.teamCode, s.playerName ?? s.type ?? "", s.id]
      .map((c) => escapeCsvCell(String(c)))
      .join(","),
  );
  return [header, ...lines].join("\n");
}
