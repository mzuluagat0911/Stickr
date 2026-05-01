-- Ofertas simples compra / venta por figurita (número dentro de tu edición, alcance y precio en centavos).

CREATE TABLE public.market_intentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  album_edition text NOT NULL,
  sticker_number integer NOT NULL,
  sticker_id text NOT NULL REFERENCES public.sticker_catalog(id) ON DELETE RESTRICT,
  kind text NOT NULL,
  shipping_scope text NOT NULL,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'ARS',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now (),
  updated_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT market_intentions_kind_check CHECK (
    kind IN ('buy', 'sell')
  ),
  CONSTRAINT market_intentions_scope_check CHECK (
    shipping_scope IN ('local_only', 'national')
  ),
  CONSTRAINT market_intentions_status_check CHECK (
    status IN ('active', 'cancelled', 'filled')
  ),
  CONSTRAINT market_intentions_currency_len CHECK (char_length(currency) = 3),
  CONSTRAINT market_intentions_price_check CHECK (
    price_cents >= 50
      AND price_cents <= 100000000
  )
);

--> statement-breakpoint
CREATE UNIQUE INDEX market_intentions_user_sticker_kind_active_idx ON public.market_intentions (
  user_id,
  sticker_id,
  kind
)
WHERE status = 'active';

--> statement-breakpoint
CREATE INDEX market_intentions_status_created_desc_idx ON public.market_intentions (status, created_at DESC);

--> statement-breakpoint
ALTER TABLE public.market_intentions ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE POLICY "market_intentions_select"
  ON public.market_intentions FOR SELECT TO authenticated
  USING (
    status = 'active'
      OR auth.uid() = user_id
  );

--> statement-breakpoint
CREATE POLICY "market_intentions_insert_own"
  ON public.market_intentions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

--> statement-breakpoint
CREATE POLICY "market_intentions_update_own"
  ON public.market_intentions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
