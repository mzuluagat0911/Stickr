import { z } from "zod";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const conversationIdSchema = z
  .string()
  .trim()
  .regex(UUID_RE, "Identificador inválido.");

export const messageContentSchema = z
  .string()
  .trim()
  .min(1, "Escribe un mensaje.")
  .max(2000, "Máximo 2000 caracteres.");
