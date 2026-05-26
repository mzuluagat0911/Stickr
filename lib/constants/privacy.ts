import type { PrivacySettings } from "@/lib/types/profile";

/** Valores por defecto al crear perfil o si `privacy_settings` está vacío. */
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  album_visibility: "public",
  proposals_from: "anyone",
};
