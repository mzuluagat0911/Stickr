export type ContactVisibility = "post_trade" | "always" | "never";

export type ContactPreferred = "whatsapp" | "telegram" | "email";

export type ContactMethods = {
  whatsapp?: { number: string; visibility: ContactVisibility };
  telegram?: { username: string; visibility: ContactVisibility };
  email_public?: { address: string; visibility: ContactVisibility };
  preferred?: ContactPreferred;
};

export type PrivacySettings = {
  album_visibility: "public" | "registered" | "private";
  proposals_from: "anyone" | "reputation_min" | "friends_only";
  reputation_min?: number;
};
