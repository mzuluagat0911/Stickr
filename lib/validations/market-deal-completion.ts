import { z } from "zod";

export const marketDealRatingSchema = z.coerce
  .number()
  .int()
  .min(1, "Mínimo 1 estrella.")
  .max(5, "Máximo 5 estrellas.");

export const marketDealReviewTextSchema = z.preprocess(
  (v) => (v == null ? "" : String(v)),
  z
    .string()
    .trim()
    .max(280, "Máximo 280 caracteres.")
    .optional()
    .transform((s) => (s && s.length > 0 ? s : undefined)),
);
