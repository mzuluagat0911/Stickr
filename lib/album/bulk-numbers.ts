import type { CatalogStickerDTO } from "@/lib/album/types";

export const BULK_OPERATION_MAX_ITEMS = 300;

/** Rangos muy largos sin sentido práctico; se omiten sin error duro. */
const MAX_RANGE_SPAN = 500;

/** Parse texto libre (comas, saltos de línea, rangos tipo 12-18). */
export function parseStickerNumberTokens(raw: string): number[] {
  const normalized = raw
    .replace(/[\u00A0\u200B]/g, "")
    .replace(/;/g, ",")
    .replace(/\s+/g, ",");

  const tokens = normalized
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const out: number[] = [];

  for (const tok of tokens) {
    const m = /^(\d{1,5})\s*[-–]\s*(\d{1,5})$/u.exec(tok);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      if (hi - lo > MAX_RANGE_SPAN) continue;
      for (let i = lo; i <= hi; i++) out.push(i);
      continue;
    }

    const n = Number(tok);
    if (Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 99_999) {
      out.push(n);
    }
  }

  return [...new Set(out)].sort((a, b) => a - b);
}

export function buildStickerNumberIndex(
  catalog: CatalogStickerDTO[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const s of catalog) {
    map.set(s.stickerNumber, s.id);
  }
  return map;
}

export function resolveStickerIdsFromNumbers(
  nums: readonly number[],
  catalog: CatalogStickerDTO[],
): { stickerIds: string[]; unmatched: number[] } {
  const idx = buildStickerNumberIndex(catalog);
  const stickerIds: string[] = [];
  const unmatched: number[] = [];
  const seen = new Set<string>();

  for (const num of nums) {
    const id = idx.get(num);
    if (!id) {
      unmatched.push(num);
      continue;
    }
    if (!seen.has(id)) {
      seen.add(id);
      stickerIds.push(id);
    }
  }

  return { stickerIds, unmatched };
}
