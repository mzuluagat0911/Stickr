import { z } from "zod";

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

export function formatOverlapStickerLine(s: ExchangeOverlapStickerRow): string {
  const name = (s.playerName ?? "").trim();
  const bits = [`#${s.stickerNumber}`, s.teamCode];
  if (name) bits.push(name);
  return bits.join(" · ");
}
