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
import { DEFAULT_PRIVACY_SETTINGS } from "@/lib/constants/privacy";
import type { ContactMethods } from "@/lib/types/profile";

function toUsernameBase(input: string): string {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (normalized.length >= 3) return normalized.slice(0, 32);
  return `user_${Math.floor(Math.random() * 90000 + 10000)}`;
}

async function updateOrInsertOnboardingProfile(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  profilePatch: Record<string, unknown>;
}) {
  const { supabase, userId, profilePatch } = params;
  const { data: updatedRow, error } = await supabase
    .from("user_profiles")
    .update(profilePatch)
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error) return { updatedRow: null, error };
  if (updatedRow) return { updatedRow, error: null };
  const { error: insertError } = await supabase.from("user_profiles").insert({
    id: userId,
    ...profilePatch,
  });
  return { updatedRow: null, error: insertError ?? null };
}

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
  const parsed = onboardingSchema.safeParse({
    displayName: raw.displayName,
    username: raw.username,
    countryCode: raw.countryCode,
    city: raw.city,
    albumEdition: raw.albumEdition || "PR-International",
    geoOptIn: raw.geoOptIn === "on" || raw.geoOptIn === "true",
    tradeNationalShipping: raw.tradeNationalShipping,
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
  const baseUsername = toUsernameBase(d.username || d.displayName);
  let usernameCandidate = baseUsername;
  const tradePrefs = {
    in_person: true,
    national_shipping: d.tradeNationalShipping,
    international_shipping: false,
    sale_in_person: false,
    sale_national_shipping: false,
    sale_international_shipping: false,
  };
  const contactPatch: ContactMethods =
    (d.contactMethods as ContactMethods | undefined) ?? {};
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) {
      usernameCandidate = `${baseUsername.slice(0, 27)}_${Math.floor(
        Math.random() * 9000 + 1000,
      )}`;
    }
    const profilePatch = {
      username: usernameCandidate,
      display_name: d.displayName.trim(),
      country_code: d.countryCode,
      city: d.city,
      languages: ["es"],
      album_edition: d.albumEdition,
      geo_opt_in: d.geoOptIn,
      trade_preferences: tradePrefs,
      contact_methods: contactPatch,
      privacy_settings: DEFAULT_PRIVACY_SETTINGS,
      onboarding_completed: true,
      last_active_at: new Date().toISOString(),
    };
    const { error } = await updateOrInsertOnboardingProfile({
      supabase,
      userId: user.id,
      profilePatch,
    });
    if (!error) break;
    if (error.code === "23505") {
      if (attempt === 2) {
        return fail(
          "No pudimos asignar un usuario único. Intenta de nuevo en unos segundos.",
        );
      }
      continue;
    }
    return fail(error.message);
  }

  redirect("/onboarding/share-location");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
