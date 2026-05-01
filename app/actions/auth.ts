"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/result";
import { fail, ok } from "@/lib/types/result";
import { getPublicAppUrl } from "@/lib/env/public-app-url";
import {
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  signupSchema,
} from "@/lib/validations/auth";
import type { ContactMethods } from "@/lib/types/profile";

export async function signInWithEmailAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = loginSchema.safeParse({
    email: raw.email,
    password: raw.password,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return fail(msg);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return fail(
      error.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos"
        : error.message,
    );
  }

  redirect("/album");
}

export async function signUpAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = signupSchema.safeParse({
    name: raw.name,
    email: raw.email,
    password: raw.password,
    confirmPassword: raw.confirmPassword,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return fail(msg);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getPublicAppUrl()}/auth/callback`,
      data: {
        display_name: parsed.data.name,
        full_name: parsed.data.name,
      },
    },
  });

  if (error) {
    return fail(error.message);
  }

  return ok(
    "Revisa tu correo para confirmar la cuenta (el enlace expira en unos minutos).",
  );
}

export async function requestPasswordResetAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = forgotPasswordSchema.safeParse({ email: raw.email });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Correo inválido");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${getPublicAppUrl()}/auth/confirm?next=/reset-password`,
    },
  );

  if (error) {
    return fail(error.message);
  }

  return ok(
    "Si el correo existe, recibirás un enlace para restablecer la contraseña.",
  );
}

export async function completeOnboardingAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const languagesRaw = String(raw.languages ?? "");
  const parsed = onboardingSchema.safeParse({
    username: raw.username,
    countryCode: raw.countryCode,
    city: raw.city,
    languages: languagesRaw,
    albumEdition: raw.albumEdition || "PR-International",
    geoOptIn: raw.geoOptIn === "on" || raw.geoOptIn === "true",
    tradeInPerson: raw.tradeInPerson,
    tradeNationalShipping: raw.tradeNationalShipping,
    tradeInternationalShipping: raw.tradeInternationalShipping,
    saleInPerson: raw.saleInPerson,
    saleNationalShipping: raw.saleNationalShipping,
    saleInternationalShipping: raw.saleInternationalShipping,
    whatsappNational: raw.whatsappNational,
  });

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return fail("Sesión no válida. Inicia sesión de nuevo.");
  }

  const d = parsed.data;
  const tradePrefs = {
    in_person: d.tradeInPerson,
    national_shipping: d.tradeNationalShipping,
    international_shipping: d.tradeInternationalShipping,
    sale_in_person: d.saleInPerson,
    sale_national_shipping: d.saleNationalShipping,
    sale_international_shipping: d.saleInternationalShipping,
  };
  const contactPatch: ContactMethods =
    (d.contactMethods as ContactMethods | undefined) ?? {};

  const { data: updatedRow, error } = await supabase
    .from("user_profiles")
    .update({
      username: d.username,
      country_code: d.countryCode,
      city: d.city,
      languages: d.languages,
      album_edition: d.albumEdition,
      geo_opt_in: d.geoOptIn,
      trade_preferences: tradePrefs,
      contact_methods: contactPatch,
      onboarding_completed: true,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return fail("Ese nombre de usuario ya está en uso.");
    }
    return fail(error.message);
  }

  // Backfill de perfiles legacy: si no existe fila, la creamos.
  if (!updatedRow) {
    const { error: insertError } = await supabase.from("user_profiles").insert({
      id: user.id,
      username: d.username,
      country_code: d.countryCode,
      city: d.city,
      languages: d.languages,
      album_edition: d.albumEdition,
      geo_opt_in: d.geoOptIn,
      trade_preferences: tradePrefs,
      contact_methods: contactPatch,
      onboarding_completed: true,
      last_active_at: new Date().toISOString(),
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return fail("Ese nombre de usuario ya está en uso.");
      }
      return fail(insertError.message);
    }
  }

  redirect("/onboarding/share-location");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
