CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"created_at" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	CONSTRAINT "conversations_user_a_user_b" UNIQUE("user_a","user_b"),
	CONSTRAINT "conversations_user_order" CHECK ("user_a" < "user_b")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"sticker_id" text NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"condition" text,
	"photo_url" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone,
	CONSTRAINT "listings_condition_check" CHECK ("condition" IS NULL OR "condition" IN ('mint', 'used', 'damaged')),
	CONSTRAINT "listings_status_check" CHECK ("status" IN ('active', 'sold', 'cancelled')),
	CONSTRAINT "listings_currency_len" CHECK (char_length("currency") = 3)
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"attachment_url" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	CONSTRAINT "notifications_type_check" CHECK ("type" IN (
          'new_match',
          'new_message',
          'trade_proposed',
          'trade_accepted',
          'trade_completed',
          'order_paid',
          'order_shipped',
          'review_received'
        ))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"payment_provider" text,
	"payment_intent_id" text,
	"created_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	CONSTRAINT "orders_status_check" CHECK ("status" IN (
          'pending_payment',
          'escrow_held',
          'shipped',
          'delivered',
          'released',
          'disputed',
          'refunded'
        )),
	CONSTRAINT "orders_payment_provider_check" CHECK ("payment_provider" IS NULL OR "payment_provider" IN ('stripe', 'mercadopago')),
	CONSTRAINT "orders_currency_len" CHECK (char_length("currency") = 3)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"target_listing_id" uuid,
	"target_message_id" uuid,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone,
	CONSTRAINT "reports_status_check" CHECK ("status" IN ('pending', 'reviewed', 'actioned', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid,
	"order_id" uuid,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"created_at" timestamp with time zone,
	CONSTRAINT "reviews_context_check" CHECK ("trade_id" IS NOT NULL OR "order_id" IS NOT NULL),
	CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_review_text_len" CHECK ("review_text" IS NULL OR char_length("review_text") <= 280)
);
--> statement-breakpoint
CREATE TABLE "sticker_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"album_edition" text NOT NULL,
	"sticker_number" integer NOT NULL,
	"team_code" text NOT NULL,
	"position_in_team" integer NOT NULL,
	"type" text NOT NULL,
	"player_name" text,
	"player_position" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sticker_catalog_album_edition_sticker_number" UNIQUE("album_edition","sticker_number"),
	CONSTRAINT "sticker_catalog_type_check" CHECK ("type" IN (
        'regular',
        'special_legendary',
        'special_gold',
        'team_crest',
        'team_photo'
      ))
);
--> statement-breakpoint
CREATE TABLE "trade_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid NOT NULL,
	"side" text NOT NULL,
	"sticker_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "trade_items_side_check" CHECK ("side" IN ('offer', 'request'))
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposer_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"status" text NOT NULL,
	"modality" text,
	"meeting_location" text,
	"proposer_confirmed_at" timestamp with time zone,
	"receiver_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "trades_status_check" CHECK ("status" IN ('proposed', 'accepted', 'rejected', 'countered', 'completed', 'cancelled', 'disputed')),
	CONSTRAINT "trades_modality_check" CHECK ("modality" IS NULL OR "modality" IN ('in_person', 'shipping'))
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"bio" text,
	"country_code" text NOT NULL,
	"city" text NOT NULL,
	"location_jittered" "geography(Point,4326)",
	"album_edition" text DEFAULT 'PR-International' NOT NULL,
	"languages" text[] DEFAULT ARRAY['en']::text[] NOT NULL,
	"trade_preferences" jsonb,
	"rating_avg" numeric(3, 2) DEFAULT '0' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"trades_completed" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_username_unique" UNIQUE("username"),
	CONSTRAINT "user_profiles_bio_len" CHECK ("bio" IS NULL OR char_length("bio") <= 200),
	CONSTRAINT "user_profiles_country_code_len" CHECK (char_length("country_code") = 2)
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
CREATE TABLE "user_stickers" (
	"user_id" uuid NOT NULL,
	"sticker_id" text NOT NULL,
	"status" text NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_stickers_user_id_sticker_id_pk" PRIMARY KEY("user_id","sticker_id"),
	CONSTRAINT "user_stickers_status_check" CHECK ("status" IN ('have', 'duplicate', 'missing'))
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_a_user_profiles_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_b_user_profiles_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_user_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_sticker_id_sticker_catalog_id_fk" FOREIGN KEY ("sticker_id") REFERENCES "public"."sticker_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_user_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_user_profiles_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_user_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_user_id_user_profiles_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_listing_id_listings_id_fk" FOREIGN KEY ("target_listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_message_id_messages_id_fk" FOREIGN KEY ("target_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_user_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_user_profiles_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_sticker_id_sticker_catalog_id_fk" FOREIGN KEY ("sticker_id") REFERENCES "public"."sticker_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_proposer_id_user_profiles_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_receiver_id_user_profiles_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stickers" ADD CONSTRAINT "user_stickers_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stickers" ADD CONSTRAINT "user_stickers_sticker_id_sticker_catalog_id_fk" FOREIGN KEY ("sticker_id") REFERENCES "public"."sticker_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listings_sticker_id_status_price_cents" ON "listings" USING btree ("sticker_id","status","price_cents");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_created_at_desc" ON "messages" USING btree ("conversation_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_at_created_at_desc" ON "notifications" USING btree ("user_id","read_at","created_at" DESC);--> statement-breakpoint
CREATE INDEX "user_profiles_location_jittered_gist" ON "user_profiles" USING gist ("location_jittered");--> statement-breakpoint
CREATE INDEX "user_stickers_sticker_id_status" ON "user_stickers" USING btree ("sticker_id","status");