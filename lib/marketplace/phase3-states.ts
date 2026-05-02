/**
 * Contrato de estados para Fase 3 (marketplace + trades).
 * Las tablas usan CHECK en SQL; aquí solo referencia tipada en app.
 */

/** Filas en `market_intentions.status` (migración 0006). */
export const MARKET_INTENTION_STATUS = [
  "active",
  "cancelled",
  "filled",
] as const;

export type MarketIntentionStatus = (typeof MARKET_INTENTION_STATUS)[number];

/** Publicaciones visibles en el feed global. */
export const ACTIVE_MARKET_INTENTION_STATUS: MarketIntentionStatus = "active";

/** Filas en `trades.status` (migración 0000). */
export const TRADE_STATUS = [
  "proposed",
  "accepted",
  "rejected",
  "countered",
  "completed",
  "cancelled",
  "disputed",
] as const;

export type TradeStatus = (typeof TRADE_STATUS)[number];

/** Filas en `market_offers.status` (migración 0011). */
export const MARKET_OFFER_STATUS = [
  "pending",
  "accepted",
  "rejected",
  "superseded",
] as const;

export type MarketOfferStatus = (typeof MARKET_OFFER_STATUS)[number];

/** Filas en `market_deals.status` (migración 0012). */
export const MARKET_DEAL_STATUS = ["open", "completed", "cancelled"] as const;

export type MarketDealStatus = (typeof MARKET_DEAL_STATUS)[number];
