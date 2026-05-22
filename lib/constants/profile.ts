export const ALBUM_EDITION_OPTIONS = [
  { value: "PR-International", label: "PR-International" },
  { value: "PR-Argentina", label: "PR-Argentina" },
  { value: "PR-Brasil", label: "PR-Brasil" },
  { value: "PR-México", label: "PR-México" },
  { value: "PR-Otro", label: "Otras ediciones" },
] as const;

export const PROFILE_LANGUAGE_OPTIONS = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
] as const;

export const VISIBILITY_LABELS: Record<
  "post_trade" | "always" | "never",
  string
> = {
  post_trade: "Visible en Intercambio (y tras acordar en chat)",
  always: "Visible en Intercambio y perfil",
  never: "No mostrar",
};
