export type MarketFeedIntent = {
  id: string;
  stickerNumber: number;
  stickerId: string;
  kind: "buy" | "sell";
  shippingScope: "local_only" | "national";
  priceCents: number;
  currency: string;
  albumEdition: string;
  createdAt: string | null;
  userId: string;
  username: string | null;
};
