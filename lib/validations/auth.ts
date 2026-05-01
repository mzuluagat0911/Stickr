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
    username: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(32, "Máximo 32 caracteres")
      .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
    countryCode: z
      .string()
      .length(2, "Código de país ISO 3166-1 alpha-2 (2 letras)")
      .transform((s) => s.toUpperCase()),
    city: z.string().min(1, "Ciudad obligatoria").max(120),
    languages: z
      .string()
      .min(1)
      .transform((s) =>
        s
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
      )
      .pipe(
        z.array(z.string().min(2)).min(1, "Al menos un idioma (ej: es, en)"),
      ),
    albumEdition: z.string().min(1, "Edición del álbum obligatoria"),
    geoOptIn: z.boolean().optional().default(false),
    tradeInPerson: z.preprocess(boolHiddenFalse, z.boolean()),
    tradeNationalShipping: z.preprocess(boolHiddenFalse, z.boolean()),
    tradeInternationalShipping: z.preprocess(boolHiddenFalse, z.boolean()),
    saleInPerson: z.preprocess(boolHiddenFalse, z.boolean()),
    saleNationalShipping: z.preprocess(boolHiddenFalse, z.boolean()),
    saleInternationalShipping: z.preprocess(boolHiddenFalse, z.boolean()),
    whatsappNational: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : ""),
      z.string(),
    ),
  })
  .superRefine((data, ctx) => {
    if (!data.whatsappNational) return;
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
    let contactMethods:
      | {
          whatsapp?: { number: string; visibility: "post_trade" };
          preferred?: "whatsapp";
        }
      | undefined;
    if (data.whatsappNational) {
      const p = parsePhoneNumberFromString(
        data.whatsappNational,
        data.countryCode as CountryCode,
      );
      if (p?.isValid()) {
        contactMethods = {
          whatsapp: {
            number: p.format("E.164"),
            visibility: "post_trade",
          },
          preferred: "whatsapp",
        };
      }
    }
    return { ...data, contactMethods };
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
