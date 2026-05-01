"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { UserStickerMapDTO } from "@/lib/album/types";
import type { ActionResult } from "@/lib/types/result";
import { fail, ok } from "@/lib/types/result";

const stickerIdSchema = z.string().min(1).max(128);

const bulkUpdateSchema = z.array(
  z.object({
    stickerId: stickerIdSchema,
    status: z.enum(["have", "duplicate", "missing"]),
    count: z.number().int().min(0).max(999).optional(),
  }),
);

async function requireUserId(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false, message: "Sesión no válida." };
  }
  return { ok: true, userId: user.id };
}

export async function getUserStickersMapAction(): Promise<
  ActionResult<UserStickerMapDTO>
> {
  const u = await requireUserId();
  if (!u.ok) {
    return fail(u.message);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_stickers")
    .select("sticker_id, status, duplicate_count")
    .eq("user_id", u.userId);

  if (error) {
    return fail(error.message);
  }

  const map: UserStickerMapDTO = {};
  for (const row of data ?? []) {
    const st = row.status as string;
    if (st !== "have" && st !== "duplicate") continue;
    map[row.sticker_id as string] = {
      status: st,
      duplicateCount: Number(row.duplicate_count ?? 0),
    };
  }
  return ok(map);
}

export async function markStickerHaveAction(
  stickerId: string,
): Promise<ActionResult> {
  const parsed = stickerIdSchema.safeParse(stickerId);
  if (!parsed.success) {
    return fail("Identificador de figurita inválido");
  }
  const u = await requireUserId();
  if (!u.ok) {
    return fail(u.message);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_stickers").upsert(
    {
      user_id: u.userId,
      sticker_id: parsed.data,
      status: "have",
      duplicate_count: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,sticker_id" },
  );

  if (error) {
    return fail(error.message);
  }
  return ok();
}

export async function markStickerDuplicateAction(
  stickerId: string,
  count: number,
): Promise<ActionResult> {
  const parsedId = stickerIdSchema.safeParse(stickerId);
  if (!parsedId.success) {
    return fail("Identificador de figurita inválido");
  }
  if (!Number.isInteger(count) || count < 2 || count > 999) {
    return fail("Cantidad de repetidas inválida");
  }
  const u = await requireUserId();
  if (!u.ok) {
    return fail(u.message);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_stickers").upsert(
    {
      user_id: u.userId,
      sticker_id: parsedId.data,
      status: "duplicate",
      duplicate_count: count,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,sticker_id" },
  );

  if (error) {
    return fail(error.message);
  }
  return ok();
}

export async function unmarkStickerAction(
  stickerId: string,
): Promise<ActionResult> {
  const parsed = stickerIdSchema.safeParse(stickerId);
  if (!parsed.success) {
    return fail("Identificador de figurita inválido");
  }
  const u = await requireUserId();
  if (!u.ok) {
    return fail(u.message);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_stickers")
    .delete()
    .eq("user_id", u.userId)
    .eq("sticker_id", parsed.data);

  if (error) {
    return fail(error.message);
  }
  return ok();
}

export async function bulkMarkStickersAction(
  updates: Array<{ stickerId: string; status: string; count?: number }>,
): Promise<ActionResult> {
  const parsed = bulkUpdateSchema.safeParse(updates);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Lote inválido");
  }
  const u = await requireUserId();
  if (!u.ok) {
    return fail(u.message);
  }

  const supabase = await createClient();

  for (const item of parsed.data) {
    if (item.status === "missing") {
      const { error } = await supabase
        .from("user_stickers")
        .delete()
        .eq("user_id", u.userId)
        .eq("sticker_id", item.stickerId);
      if (error) return fail(error.message);
      continue;
    }

    if (item.status === "have") {
      const { error } = await supabase.from("user_stickers").upsert(
        {
          user_id: u.userId,
          sticker_id: item.stickerId,
          status: "have",
          duplicate_count: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,sticker_id" },
      );
      if (error) return fail(error.message);
      continue;
    }

    const c = item.count ?? 2;
    if (c < 2) {
      return fail("Cantidad mínima para repetida: 2");
    }
    const { error } = await supabase.from("user_stickers").upsert(
      {
        user_id: u.userId,
        sticker_id: item.stickerId,
        status: "duplicate",
        duplicate_count: c,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,sticker_id" },
    );
    if (error) return fail(error.message);
  }

  return ok();
}
