import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import type { ContactMethods, PrivacySettings } from "@/lib/types/profile";

/**
 * Geography Point en SRID 4326 (PostGIS).
 * Valores: WKT ("POINT(lon lat)") o formato que use el driver `postgres`.
 */
export const geographyPoint4326 = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "geography(Point,4326)";
  },
});

/* -------------------------------------------------------------------------- */
/* Tablas (orden por dependencias)                                            */
/* -------------------------------------------------------------------------- */

export const stickerCatalog = pgTable(
  "sticker_catalog",
  {
    id: text("id").primaryKey().notNull(),
    albumEdition: text("album_edition").notNull(),
    stickerNumber: integer("sticker_number").notNull(),
    teamCode: text("team_code").notNull(),
    positionInTeam: integer("position_in_team").notNull(),
    type: text("type").notNull(),
    playerName: text("player_name"),
    playerPosition: text("player_position"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("sticker_catalog_album_edition_sticker_number").on(
      t.albumEdition,
      t.stickerNumber,
    ),
    check(
      "sticker_catalog_type_check",
      sql.raw(`"type" IN (
        'regular',
        'special_legendary',
        'special_gold',
        'team_crest',
        'team_photo'
      )`),
    ),
  ],
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().notNull(),
    username: text("username").notNull().unique(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    countryCode: text("country_code").notNull(),
    city: text("city").notNull(),
    locationJittered: geographyPoint4326("location_jittered"),
    albumEdition: text("album_edition").notNull().default("PR-International"),
    languages: text("languages")
      .array()
      .notNull()
      .default(sql`ARRAY['en']::text[]`),
    tradePreferences: jsonb("trade_preferences").$type<{
      in_person?: boolean;
      national_shipping?: boolean;
      international_shipping?: boolean;
      sale_in_person?: boolean;
      sale_national_shipping?: boolean;
      sale_international_shipping?: boolean;
    }>(),
    contactMethods: jsonb("contact_methods").$type<ContactMethods>(),
    privacySettings: jsonb("privacy_settings").$type<PrivacySettings>(),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 })
      .notNull()
      .default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    tradesCompleted: integer("trades_completed").notNull().default(0),
    isVerified: boolean("is_verified").notNull().default(false),
    isBlocked: boolean("is_blocked").notNull().default(false),
    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),
    geoOptIn: boolean("geo_opt_in").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => [
    check(
      "user_profiles_bio_len",
      sql.raw(`"bio" IS NULL OR char_length("bio") <= 200`),
    ),
    check(
      "user_profiles_display_name_len",
      sql.raw(`"display_name" IS NULL OR char_length("display_name") <= 50`),
    ),
    check(
      "user_profiles_country_code_len",
      sql.raw(`char_length("country_code") = 2`),
    ),
    index("user_profiles_location_jittered_gist").using(
      "gist",
      sql.raw(`"location_jittered"`),
    ),
  ],
);

export const userStickers = pgTable(
  "user_stickers",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickerCatalog.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stickerId] }),
    check(
      "user_stickers_status_check",
      sql.raw(`"status" IN ('have', 'duplicate', 'missing')`),
    ),
    index("user_stickers_sticker_id_status").on(t.stickerId, t.status),
  ],
);

export const exchangeWants = pgTable(
  "exchange_wants",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickerCatalog.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stickerId] }),
    index("exchange_wants_user_id_idx").on(t.userId),
    index("exchange_wants_sticker_id_idx").on(t.stickerId),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userA: uuid("user_a")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    userB: uuid("user_b")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    /** Publicación de marketplace que originó el hilo (único por par + intención; ver migración 0010). */
    marketIntentionId: uuid("market_intention_id"),
    createdAt: timestamp("created_at", { withTimezone: true }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  },
  () => [check("conversations_user_order", sql.raw(`"user_a" < "user_b"`))],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    attachmentUrl: text("attachment_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("messages_conversation_id_created_at_desc").on(
      t.conversationId,
      sql.raw(`"created_at" DESC`),
    ),
  ],
);

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    proposerId: uuid("proposer_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    modality: text("modality"),
    meetingLocation: text("meeting_location"),
    proposerConfirmedAt: timestamp("proposer_confirmed_at", {
      withTimezone: true,
    }),
    receiverConfirmedAt: timestamp("receiver_confirmed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  () => [
    check(
      "trades_status_check",
      sql.raw(
        `"status" IN ('proposed', 'accepted', 'rejected', 'countered', 'completed', 'cancelled', 'disputed')`,
      ),
    ),
    check(
      "trades_modality_check",
      sql.raw(`"modality" IS NULL OR "modality" IN ('in_person', 'shipping')`),
    ),
  ],
);

export const tradeItems = pgTable(
  "trade_items",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    side: text("side").notNull(),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickerCatalog.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
  },
  () => [
    check("trade_items_side_check", sql.raw(`"side" IN ('offer', 'request')`)),
  ],
);

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickerCatalog.id, { onDelete: "restrict" }),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull(),
    condition: text("condition"),
    photoUrl: text("photo_url").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "listings_condition_check",
      sql.raw(
        `"condition" IS NULL OR "condition" IN ('mint', 'used', 'damaged')`,
      ),
    ),
    check(
      "listings_status_check",
      sql.raw(`"status" IN ('active', 'sold', 'cancelled')`),
    ),
    check("listings_currency_len", sql.raw(`char_length("currency") = 3`)),
    index("listings_sticker_id_status_price_cents").on(
      t.stickerId,
      t.status,
      t.priceCents,
    ),
  ],
);

export const marketIntentions = pgTable(
  "market_intentions",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    albumEdition: text("album_edition").notNull(),
    stickerNumber: integer("sticker_number").notNull(),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickerCatalog.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    shippingScope: text("shipping_scope").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("ARS"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    check("market_intentions_kind_check", sql.raw(`"kind" IN ('buy', 'sell')`)),
    check(
      "market_intentions_scope_check",
      sql.raw(`"shipping_scope" IN ('local_only', 'national')`),
    ),
    check(
      "market_intentions_status_check",
      sql.raw(`"status" IN ('active', 'cancelled', 'filled')`),
    ),
    check(
      "market_intentions_currency_check",
      sql.raw(`"currency" IN ('ARS', 'USD', 'COP', 'EUR')`),
    ),
    check(
      "market_intentions_currency_len_check",
      sql.raw(`char_length("currency") = 3`),
    ),
    index("market_intentions_status_created_idx").on(t.status, t.createdAt),
  ],
);

/** Ofertas de precio en hilos de marketplace (Fase 3.2); FK `parent_offer_id` en migración SQL. */
export const marketOffers = pgTable(
  "market_offers",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    marketIntentionId: uuid("market_intention_id")
      .notNull()
      .references(() => marketIntentions.id, { onDelete: "restrict" }),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("pending"),
    parentOfferId: uuid("parent_offer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "market_offers_status_check",
      sql.raw(`"status" IN ('pending', 'accepted', 'rejected', 'superseded')`),
    ),
    check(
      "market_offers_currency_check",
      sql.raw(`"currency" IN ('ARS', 'USD', 'COP', 'EUR')`),
    ),
    check(
      "market_offers_price_check",
      sql.raw(`"price_cents" >= 50 AND "price_cents" <= 100000000`),
    ),
    check(
      "market_offers_from_ne_to",
      sql.raw(`"from_user_id" <> "to_user_id"`),
    ),
    index("market_offers_conversation_created_idx").on(
      t.conversationId,
      t.createdAt,
    ),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    paymentProvider: text("payment_provider"),
    paymentIntentId: text("payment_intent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  () => [
    check(
      "orders_status_check",
      sql.raw(
        `"status" IN (
          'pending_payment',
          'escrow_held',
          'shipped',
          'delivered',
          'released',
          'disputed',
          'refunded'
        )`,
      ),
    ),
    check(
      "orders_payment_provider_check",
      sql.raw(
        `"payment_provider" IS NULL OR "payment_provider" IN ('stripe', 'mercadopago')`,
      ),
    ),
    check("orders_currency_len", sql.raw(`char_length("currency") = 3`)),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tradeId: uuid("trade_id").references(() => trades.id, {
      onDelete: "set null",
    }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    revieweeId: uuid("reviewee_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    reviewText: text("review_text"),
    createdAt: timestamp("created_at", { withTimezone: true }),
  },
  () => [
    check(
      "reviews_context_check",
      sql.raw(`"trade_id" IS NOT NULL OR "order_id" IS NOT NULL`),
    ),
    check("reviews_rating_range", sql.raw(`"rating" BETWEEN 1 AND 5`)),
    check(
      "reviews_review_text_len",
      sql.raw(`"review_text" IS NULL OR char_length("review_text") <= 280`),
    ),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    targetListingId: uuid("target_listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    targetMessageId: uuid("target_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }),
  },
  () => [
    check(
      "reports_status_check",
      sql.raw(`"status" IN ('pending', 'reviewed', 'actioned', 'dismissed')`),
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payload: jsonb("payload"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "notifications_type_check",
      sql.raw(
        `"type" IN (
          'new_match',
          'new_message',
          'trade_proposed',
          'trade_accepted',
          'trade_completed',
          'order_paid',
          'order_shipped',
          'review_received'
        )`,
      ),
    ),
    index("notifications_user_id_read_at_created_at_desc").on(
      t.userId,
      t.readAt,
      sql.raw(`"created_at" DESC`),
    ),
  ],
);

/**
 * --- Índices (definidos en los callbacks de cada tabla) ---
 *
 * - user_profiles: GIST sobre location_jittered
 * - user_stickers: BTREE (sticker_id, status)
 * - listings: BTREE (sticker_id, status, price_cents)
 * - messages: BTREE (conversation_id, created_at DESC)
 * - notifications: BTREE (user_id, read_at, created_at DESC)
 * - username: UNIQUE sobre user_profiles.username (constraint en columna)
 */
