export type MarketOfferRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  price_cents: number;
  currency: string;
  status: string;
  created_at: string;
  parent_offer_id: string | null;
  responded_at: string | null;
};
