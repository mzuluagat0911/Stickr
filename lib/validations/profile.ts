import type { CountryCode } from "libphonenumber-js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

import type { ContactMethods, PrivacySettings } from "@/lib/types/profile";

const visibilitySchema = z.enum(["post_trade", "always", "never"]);

const contactMethodsObjectSchema = z
  .object({
    whatsapp: z
      .object({
        number: z.string().min(5, "Número inválido"),
        visibility: visibilitySchema,
      })
      .optional(),
    telegram: z
      .object({
        username: z.string().min(2),
        visibility: visibilitySchema,
      })
      .optional(),
    email_public: z
      .object({
        address: z.email(),
        visibility: visibilitySchema,
      })
      .optional(),
    preferred: z.enum(["whatsapp", "telegram", "email"]).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.preferred === "whatsapp" && !data.whatsapp?.number) {
      ctx.addIssue({
        code: "custom",
        message: "Falta número de WhatsApp",
        path: ["whatsapp"],
      });
    }
    if (data.preferred === "telegram" && !data.telegram?.username) {
      ctx.addIssue({
        code: "custom",
        message: "Falta usuario de Telegram",
        path: ["telegram"],
      });
    }
    if (data.preferred === "email" && !data.email_public?.address) {
      ctx.addIssue({
        code: "custom",
        message: "Falta correo público",
        path: ["email_public"],
      });
    }
  });

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .max(50, "Máximo 50 caracteres")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("")),
  countryCode: z
    .string()
    .length(2)
    .transform((s) => s.toUpperCase()),
  city: z.string().min(1, "Ciudad obligatoria").max(120),
  albumEdition: z.string().min(1, "Elegí una edición").max(80),
  languages: z
    .array(z.enum(["es", "en", "pt", "it", "fr", "de"]))
    .min(1, "Elegí al menos un idioma"),
  tradePreferences: z.object({
    inPerson: z.boolean(),
    nationalShipping: z.boolean(),
    internationalShipping: z.boolean(),
  }),
  contactMethods: contactMethodsObjectSchema,
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const profileFormSchema = z
  .object({
    displayName: z.string().max(50).optional().or(z.literal("")).default(""),
    bio: z.string().max(200).optional().or(z.literal("")).default(""),
    countryCode: z.string().length(2),
    city: z.string().min(1).max(120),
    albumEdition: z.string().min(1).max(80),
    languages: z.array(z.enum(["es", "en", "pt", "it", "fr", "de"])).min(1),
    tradePreferences: z.object({
      inPerson: z.boolean(),
      nationalShipping: z.boolean(),
      internationalShipping: z.boolean(),
    }),
    whatsappCountry: z.string().length(2).optional(),
    whatsappNational: z.string().optional(),
    whatsappVisibility: visibilitySchema.default("post_trade"),
    telegramUsername: z.string().optional(),
    telegramVisibility: visibilitySchema.default("post_trade"),
    emailPublic: z.string().optional(),
    emailVisibility: visibilitySchema.default("post_trade"),
    preferred: z.enum(["whatsapp", "telegram", "email"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.preferred === "whatsapp") {
      if (!data.whatsappNational?.trim() || !data.whatsappCountry) {
        ctx.addIssue({
          code: "custom",
          message: "Indicá país y número de WhatsApp",
          path: ["whatsappNational"],
        });
        return;
      }
      const p = parsePhoneNumberFromString(
        data.whatsappNational.trim(),
        data.whatsappCountry.toUpperCase() as CountryCode,
      );
      if (!p?.isValid()) {
        ctx.addIssue({
          code: "custom",
          message: "Número de WhatsApp inválido",
          path: ["whatsappNational"],
        });
      }
    }
    if (data.preferred === "telegram" && !data.telegramUsername?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Indicá tu usuario de Telegram",
        path: ["telegramUsername"],
      });
    }
    if (data.preferred === "email") {
      const e = data.emailPublic?.trim();
      if (!e) {
        ctx.addIssue({
          code: "custom",
          message: "Indicá un correo público",
          path: ["emailPublic"],
        });
      } else if (!z.email().safeParse(e).success) {
        ctx.addIssue({
          code: "custom",
          message: "Correo inválido",
          path: ["emailPublic"],
        });
      }
    }
  })
  .transform((data): ProfileUpdateInput => {
    const contactMethods: ContactMethods = {};
    if (data.whatsappNational?.trim() && data.whatsappCountry) {
      const p = parsePhoneNumberFromString(
        data.whatsappNational.trim(),
        data.whatsappCountry.toUpperCase() as CountryCode,
      );
      if (p?.isValid()) {
        contactMethods.whatsapp = {
          number: p.format("E.164"),
          visibility: data.whatsappVisibility,
        };
      }
    }
    if (data.telegramUsername?.trim()) {
      let u = data.telegramUsername.trim();
      if (u.startsWith("@")) u = u.slice(1);
      contactMethods.telegram = {
        username: `@${u}`,
        visibility: data.telegramVisibility,
      };
    }
    if (data.emailPublic?.trim()) {
      contactMethods.email_public = {
        address: data.emailPublic.trim(),
        visibility: data.emailVisibility,
      };
    }
    if (data.preferred) {
      contactMethods.preferred = data.preferred;
    }
    return {
      displayName: data.displayName,
      bio: data.bio,
      countryCode: data.countryCode,
      city: data.city,
      albumEdition: data.albumEdition,
      languages: data.languages,
      tradePreferences: data.tradePreferences,
      contactMethods,
    };
  });

export type ProfileFormInput = z.input<typeof profileFormSchema>;

export const privacySettingsSchema = z
  .object({
    album_visibility: z.enum(["public", "registered", "private"]),
    proposals_from: z.enum(["anyone", "reputation_min", "friends_only"]),
    reputation_min: z.coerce.number().min(1).max(5).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.proposals_from === "reputation_min" &&
      (data.reputation_min === undefined || Number.isNaN(data.reputation_min))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Indicá la reputación mínima (1–5)",
        path: ["reputation_min"],
      });
    }
  })
  .transform(
    (d): PrivacySettings => ({
      album_visibility: d.album_visibility,
      proposals_from: d.proposals_from,
      ...(d.proposals_from === "reputation_min" &&
      d.reputation_min !== undefined
        ? { reputation_min: d.reputation_min }
        : {}),
    }),
  );

export type PrivacyFormInput = z.input<typeof privacySettingsSchema>;
