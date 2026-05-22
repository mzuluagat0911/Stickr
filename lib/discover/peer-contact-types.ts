export type DiscoverPeerContactInfo = {
  whatsappE164: string | null;
  /** Tiene WhatsApp configurado pero solo visible tras coordinar en chat. */
  whatsappLocked: boolean;
};
