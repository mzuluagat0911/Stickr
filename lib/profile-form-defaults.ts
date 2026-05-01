import { parsePhoneNumberFromString } from "libphonenumber-js";

import type { ContactMethods } from "@/lib/types/profile";
import {
  ALBUM_EDITION_OPTIONS,
  PROFILE_LANGUAGE_OPTIONS,
} from "@/lib/constants/profile";
import type { ProfileFormInput } from "@/lib/validations/profile";

const ALBUM_SET: Set<string> = new Set(
  ALBUM_EDITION_OPTIONS.map((o) => o.value),
);
const LANG_SET = new Set(PROFILE_LANGUAGE_OPTIONS.map((o) => o.code));

export function buildProfileFormDefaults(
  profile: {
    display_name: string | null;
    bio: string | null;
    country_code: string;
    city: string;
    album_edition: string;
    languages: string[] | null;
    trade_preferences: {
      in_person?: boolean;
      national_shipping?: boolean;
      international_shipping?: boolean;
    } | null;
    contact_methods: ContactMethods | null;
  },
  accountEmail: string,
): ProfileFormInput {
  const cm = profile.contact_methods;
  const wa = cm?.whatsapp?.number;
  let whatsappCountry = profile.country_code.slice(0, 2).toUpperCase();
  let whatsappNational = "";
  if (wa) {
    const p = parsePhoneNumberFromString(wa);
    if (p) {
      whatsappCountry = p.country ?? whatsappCountry;
      whatsappNational = p.nationalNumber ?? "";
    }
  }

  const langs = (profile.languages ?? []).filter((l) =>
    LANG_SET.has(l as (typeof PROFILE_LANGUAGE_OPTIONS)[number]["code"]),
  ) as ProfileFormInput["languages"];

  const tg = cm?.telegram?.username?.replace(/^@/, "") ?? "";

  return {
    displayName: profile.display_name ?? "",
    bio: profile.bio ?? "",
    countryCode: profile.country_code.slice(0, 2).toUpperCase(),
    city: profile.city,
    albumEdition: ALBUM_SET.has(profile.album_edition)
      ? profile.album_edition
      : "PR-Otro",
    languages: langs.length > 0 ? langs : ["es"],
    tradePreferences: {
      inPerson: profile.trade_preferences?.in_person ?? false,
      nationalShipping: profile.trade_preferences?.national_shipping ?? false,
      internationalShipping:
        profile.trade_preferences?.international_shipping ?? false,
    },
    whatsappCountry,
    whatsappNational,
    whatsappVisibility: cm?.whatsapp?.visibility ?? "post_trade",
    telegramUsername: tg,
    telegramVisibility: cm?.telegram?.visibility ?? "post_trade",
    emailPublic: cm?.email_public?.address ?? accountEmail,
    emailVisibility: cm?.email_public?.visibility ?? "post_trade",
    preferred: cm?.preferred,
  };
}
