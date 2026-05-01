"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/result";
import { fail, ok } from "@/lib/types/result";
import { applyPrivacyJitter } from "@/lib/geo/privacy-jitter";
import {
  privacySettingsSchema,
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/lib/validations/profile";

export async function updateProfileAction(
  input: ProfileUpdateInput,
): Promise<ActionResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return fail(msg);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const d = parsed.data;
  const { error } = await supabase
    .from("user_profiles")
    .update({
      display_name: d.displayName?.trim() || null,
      bio: d.bio?.trim() || null,
      country_code: d.countryCode,
      city: d.city.trim(),
      album_edition: d.albumEdition,
      languages: d.languages,
      trade_preferences: {
        in_person: d.tradePreferences.inPerson,
        national_shipping: d.tradePreferences.nationalShipping,
        international_shipping: d.tradePreferences.internationalShipping,
      },
      contact_methods: d.contactMethods,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return fail("Conflicto al guardar el perfil.");
    }
    return fail(error.message);
  }

  return ok("Perfil actualizado");
}

export async function updateLocationAction(
  latitude: number,
  longitude: number,
): Promise<ActionResult> {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return fail("Coordenadas inválidas");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const jittered = applyPrivacyJitter(latitude, longitude, 500);

  const { error } = await supabase.rpc("update_user_location_jittered", {
    p_longitude: jittered.longitude,
    p_latitude: jittered.latitude,
  });

  if (error) {
    return fail(error.message);
  }

  await supabase
    .from("user_profiles")
    .update({ geo_opt_in: true, last_active_at: new Date().toISOString() })
    .eq("id", user.id);

  return ok("Ubicación aproximada guardada (±500 m de variación).");
}

export async function updatePrivacySettingsAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = privacySettingsSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return fail(msg);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      privacy_settings: parsed.data,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return fail(error.message);
  }

  return ok("Privacidad actualizada");
}

export async function uploadAvatarAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const file = formData.get("avatar") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return fail("Seleccioná una imagen");
  }
  if (file.size > 2 * 1024 * 1024) {
    return fail("La imagen debe pesar menos de 2 MB");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return fail("Sesión no válida.");
  }

  const ext =
    (file.type === "image/png" && "png") ||
    (file.type === "image/webp" && "webp") ||
    (file.type === "image/jpeg" && "jpg") ||
    file.name.split(".").pop()?.toLowerCase() ||
    "jpg";

  if (!["jpg", "jpeg", "png", "webp"].includes(ext.replace("jpeg", "jpg"))) {
    return fail("Formato admitido: JPG, PNG o WebP");
  }

  const safeExt = ext === "jpeg" ? "jpg" : ext;
  const path = `${user.id}/${Date.now()}.${safeExt}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, buf, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (upErr) {
    return fail(
      upErr.message.includes("Bucket not found")
        ? "Configurá el bucket «avatars» en Supabase Storage (ver CLAUDE.md)."
        : upErr.message,
    );
  }

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: dbErr } = await supabase
    .from("user_profiles")
    .update({
      avatar_url: pub.publicUrl,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (dbErr) {
    return fail(dbErr.message);
  }

  return ok({ url: pub.publicUrl });
}
