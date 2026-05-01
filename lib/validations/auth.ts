import type { CountryCode } from "libphonenumber-js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80),
    email: z.email("Correo inválido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email("Correo inválido"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

function boolHiddenFalse(v: unknown): boolean {
  return v === true || v === "true" || v === "on";
}

export const onboardingSchema = z
  .object({
    displayName: z
      .string()
      .min(2, "Nombre visible obligatorio")
      .max(50, "Máximo 50 caracteres"),
    username: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(32, "Máximo 32 caracteres")
      .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo")
      .optional(),
    countryCode: z
      .string()
      .length(2, "Código de país ISO 3166-1 alpha-2 (2 letras)")
      .transform((s) => s.toUpperCase()),
    city: z.string().min(1, "Ciudad obligatoria").max(120),
    albumEdition: z.string().min(1, "Edición del álbum obligatoria"),
    geoOptIn: z.boolean().optional().default(false),
    tradeNationalShipping: z.preprocess(boolHiddenFalse, z.boolean()),
    whatsappNational: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : ""),
      z.string().min(4, "WhatsApp obligatorio"),
    ),
  })
  .superRefine((data, ctx) => {
    const p = parsePhoneNumberFromString(
      data.whatsappNational,
      data.countryCode as CountryCode,
    );
    if (!p?.isValid()) {
      ctx.addIssue({
        code: "custom",
        message:
          "Número de WhatsApp inválido para el país declarado (incluye código de área).",
        path: ["whatsappNational"],
      });
    }
  })
  .transform((data) => {
    const p = parsePhoneNumberFromString(
      data.whatsappNational,
      data.countryCode as CountryCode,
    );
    const contactMethods =
      p && p.isValid()
        ? {
            whatsapp: {
              number: p.format("E.164"),
              visibility: "post_trade" as const,
            },
            preferred: "whatsapp" as const,
          }
        : undefined;
    return { ...data, contactMethods };
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
