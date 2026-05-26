import { z } from "zod";

import {
  catalogSlotLabel,
  catalogStickerDisplayLabel,
  FWC_INTRO_CATALOG_MAX,
  FWC_INTRO_CATALOG_MIN,
} from "@/lib/album/slot-label";
import type { CatalogStickerDTO } from "@/lib/album/types";

/** Fila devuelta por `exchange_overlap_detail` (subconjuntos comunes). */
export type ExchangeOverlapStickerRow = {
  stickerId: string;
  stickerNumber: number;
  teamCode: string;
  playerName: string | null;
  tradableQty?: number;
  priorityStar?: boolean;
  theyPrioritized?: boolean;
};

export type ExchangeOverlapCounts = {
  theirDuplicatesYouNeed: number;
  yourDuplicatesTheyNeed: number;
  theirDuplicatesAll: number;
  theirMissingAll: number;
};

export type ExchangeOverlapDetailOk = {
  ok: true;
  albumEdition: string;
  theirDuplicatesYouNeed: ExchangeOverlapStickerRow[];
  yourDuplicatesTheyNeed: ExchangeOverlapStickerRow[];
  theirDuplicatesAll: ExchangeOverlapStickerRow[];
  theirMissingAll: ExchangeOverlapStickerRow[];
  counts: ExchangeOverlapCounts;
};

export type ExchangeOverlapDetailErr = {
  ok: false;
  reason: string;
  yourEdition?: string;
  theirEdition?: string;
};

export type ExchangeOverlapDetail =
  | ExchangeOverlapDetailOk
  | ExchangeOverlapDetailErr;

const rowWithQtySchema = z.object({
  stickerId: z.string(),
  stickerNumber: z.number(),
  teamCode: z.string(),
  tradableQty: z.number(),
  playerName: z.string().nullable(),
  priorityStar: z.boolean().optional(),
  theyPrioritized: z.boolean().optional(),
});

const rowMissingSchema = z.object({
  stickerId: z.string(),
  stickerNumber: z.number(),
  teamCode: z.string(),
  playerName: z.string().nullable(),
});

const countsSchema = z.object({
  theirDuplicatesYouNeed: z.number(),
  yourDuplicatesTheyNeed: z.number(),
  theirDuplicatesAll: z.number(),
  theirMissingAll: z.number(),
});

const okSchema = z.object({
  ok: z.literal(true),
  albumEdition: z.string(),
  theirDuplicatesYouNeed: z.array(rowWithQtySchema),
  yourDuplicatesTheyNeed: z.array(rowWithQtySchema),
  theirDuplicatesAll: z.array(rowWithQtySchema),
  theirMissingAll: z.array(rowMissingSchema),
  counts: countsSchema,
});

const errSchema = z.object({
  ok: z.literal(false),
  reason: z.string(),
  yourEdition: z.string().optional(),
  theirEdition: z.string().optional(),
});

export function parseExchangeOverlapDetail(
  raw: unknown,
): ExchangeOverlapDetail | null {
  const asOk = okSchema.safeParse(raw);
  if (asOk.success) return asOk.data;
  const asErr = errSchema.safeParse(raw);
  if (asErr.success) return asErr.data;
  return null;
}

const MUSEUM_CATALOG_START = 981;

const RE_PR_INT = /^PR-INT-(\d+)$/i;
/** Código FIFA (3 letras) + ranura 01–20, p. ej. `MEX01`, `ARG13`. */
const RE_TEAM_SLOT = /^([A-Z]{3})(\d{2})$/i;

function inferNationalSlotType(slot1Based: number): CatalogStickerDTO["type"] {
  if (slot1Based === 1) return "team_crest";
  if (slot1Based === 13) return "team_photo";
  return "regular";
}

/** Misma lógica que `scripts/seed-catalog.ts` intro FWC (n 1–20). */
function inferFwcIntroType(n: number): CatalogStickerDTO["type"] {
  if (n <= 15) return n === 15 ? "team_photo" : "regular";
  return n % 2 === 0 ? "special_gold" : "special_legendary";
}

/**
 * Construye un DTO mínimo para reutilizar las etiquetas del álbum (`catalogStickerDisplayLabel` / `catalogSlotLabel`).
 * Los `id` del catálogo suelen ser `PR-INT-{n}` (intro/museo) o `{TEAM}{01–20}` (selecciones).
 */
export function overlapStickerCatalogDto(
  row: ExchangeOverlapStickerRow,
): CatalogStickerDTO | null {
  const id = row.stickerId.trim();
  const sn = row.stickerNumber;
  const tc = row.teamCode.trim().toUpperCase();

  const dto = (
    partial: Pick<
      CatalogStickerDTO,
      "teamCode" | "stickerNumber" | "positionInTeam" | "type"
    >,
  ): CatalogStickerDTO => ({
    id: row.stickerId,
    stickerNumber: partial.stickerNumber,
    teamCode: partial.teamCode,
    positionInTeam: partial.positionInTeam,
    type: partial.type,
    playerName: row.playerName,
    playerPosition: null,
    imageUrl: null,
  });

  const mPr = id.match(RE_PR_INT);
  if (mPr) {
    const n = Number(mPr[1]);
    if (n >= FWC_INTRO_CATALOG_MIN && n <= FWC_INTRO_CATALOG_MAX) {
      return dto({
        teamCode: "FWC",
        stickerNumber: n,
        positionInTeam: n - 1,
        type: inferFwcIntroType(n),
      });
    }
    if (n >= MUSEUM_CATALOG_START) {
      const pos = n - MUSEUM_CATALOG_START;
      return dto({
        teamCode: "MUSEUM",
        stickerNumber: sn,
        positionInTeam: pos,
        type: pos % 2 === 0 ? "special_legendary" : "special_gold",
      });
    }
  }

  const mTeam = id.match(RE_TEAM_SLOT);
  if (mTeam) {
    const team = mTeam[1]!.toUpperCase();
    const slot = Number(mTeam[2]!);
    if (slot >= 1 && slot <= 20) {
      return dto({
        teamCode: team,
        stickerNumber: sn,
        positionInTeam: slot - 1,
        type: inferNationalSlotType(slot),
      });
    }
  }

  if (
    tc === "FWC" &&
    sn >= FWC_INTRO_CATALOG_MIN &&
    sn <= FWC_INTRO_CATALOG_MAX
  ) {
    return dto({
      teamCode: "FWC",
      stickerNumber: sn,
      positionInTeam: sn - 1,
      type: inferFwcIntroType(sn),
    });
  }
  if (tc === "MUSEUM" && sn >= MUSEUM_CATALOG_START) {
    const pos = sn - MUSEUM_CATALOG_START;
    return dto({
      teamCode: "MUSEUM",
      stickerNumber: sn,
      positionInTeam: pos,
      type: pos % 2 === 0 ? "special_legendary" : "special_gold",
    });
  }

  return null;
}

export function formatOverlapStickerLine(s: ExchangeOverlapStickerRow): string {
  const cat = overlapStickerCatalogDto(s);
  if (cat) {
    const panini = `${catalogStickerDisplayLabel(cat)} · ${catalogSlotLabel(cat)}`;
    const bits = [panini];
    const name = (s.playerName ?? "").trim();
    if (name) bits.push(name);
    if (s.tradableQty != null && s.tradableQty > 1) {
      bits.push(`×${s.tradableQty} disp.`);
    }
    if (s.priorityStar || s.theyPrioritized) bits.push("⭐");
    return bits.join(" · ");
  }
  const name = (s.playerName ?? "").trim();
  const bits = [`#${s.stickerNumber}`, s.teamCode];
  if (name) bits.push(name);
  if (s.tradableQty != null && s.tradableQty > 1) {
    bits.push(`×${s.tradableQty} disp.`);
  }
  if (s.priorityStar || s.theyPrioritized) bits.push("⭐");
  return bits.join(" · ");
}
