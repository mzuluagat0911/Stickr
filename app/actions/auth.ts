"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/result";
import { fail, ok } from "@/lib/types/result";
import {
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  signupSchema,
} from "@/lib/validations/auth";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
      emailRedirectTo: `${appUrl()}/auth/callback`,
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
      redirectTo: `${appUrl()}/auth/confirm?next=/reset-password`,
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
    return fail("Sesión no válida. Iniciá sesión de nuevo.");
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      username: parsed.data.username,
      country_code: parsed.data.countryCode,
      city: parsed.data.city,
      languages: parsed.data.languages,
      album_edition: parsed.data.albumEdition,
      geo_opt_in: parsed.data.geoOptIn,
      onboarding_completed: true,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return fail("Ese nombre de usuario ya está en uso.");
    }
    return fail(error.message);
  }

  redirect("/album");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
