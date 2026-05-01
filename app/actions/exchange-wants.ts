"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/result";
import { fail, ok } from "@/lib/types/result";

const stickerIdSchema = z.string().min(1).max(128);

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

async function collectableForExchange(
  supabase: ServerSupabase,
  userId: string,
  edition: string,
  stickerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: sticker, error } = await supabase
    .from("sticker_catalog")
    .select("id")
    .eq("id", stickerId)
    .eq("album_edition", edition)
    .maybeSingle();
  if (error) {
    return { ok: false, message: error.message };
  }
  if (!sticker) {
    return {
      ok: false,
      message: "Esa figurita no existe en tu edición de álbum.",
    };
  }

  const { data: us } = await supabase
    .from("user_stickers")
    .select("status")
    .eq("user_id", userId)
    .eq("sticker_id", stickerId)
    .maybeSingle();

  const st = (us?.status as string | undefined) ?? null;
  if (st === "have" || st === "duplicate") {
    return {
      ok: false,
      message:
        "Esta figurita ya aparece como «tengo» o «repetida». Déjala en falta en el álbum si quieres priorizarla en Intercambio.",
    };
  }

  return { ok: true };
}

export async function getExchangeWantIdsAction(): Promise<
  ActionResult<string[]>
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return fail("Sesión no válida.");
  }

  const { data: rows, error: qErr } = await supabase
    .from("exchange_wants")
    .select("sticker_id")
    .eq("user_id", user.id);

  if (qErr) {
    return fail(qErr.message);
  }

  const ids = (rows ?? []).map((r) => r.sticker_id as string).filter(Boolean);
  return ok(ids);
}

export async function toggleExchangeWantAction(
  stickerId: string,
): Promise<ActionResult<{ prioritized: boolean }>> {
  const parsed = stickerIdSchema.safeParse(stickerId);
  if (!parsed.success) {
    return fail("Identificador de figurita inválido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return fail("Sesión no válida.");
  }

  const { data: profile, error: pErr } = await supabase
    .from("user_profiles")
    .select("album_edition")
    .eq("id", user.id)
    .maybeSingle();
  if (pErr || !profile) {
    return fail("No encontramos tu perfil.");
  }
  const edition =
    typeof profile.album_edition === "string"
      ? profile.album_edition
      : "PR-International";

  const chk = await collectableForExchange(
    supabase,
    user.id,
    edition,
    parsed.data,
  );
  if (!chk.ok) {
    return fail(chk.message);
  }

  const { data: exists } = await supabase
    .from("exchange_wants")
    .select("sticker_id")
    .eq("user_id", user.id)
    .eq("sticker_id", parsed.data)
    .maybeSingle();

  if (exists?.sticker_id) {
    const { error: dErr } = await supabase
      .from("exchange_wants")
      .delete()
      .eq("user_id", user.id)
      .eq("sticker_id", parsed.data);
    if (dErr) {
      return fail(dErr.message);
    }
    revalidatePath("/album");
    revalidatePath("/discover");
    return ok({ prioritized: false });
  }

  const { error: iErr } = await supabase.from("exchange_wants").insert({
    user_id: user.id,
    sticker_id: parsed.data,
  });

  if (iErr) {
    return fail(iErr.message);
  }
  revalidatePath("/album");
  revalidatePath("/discover");
  return ok({ prioritized: true });
}
