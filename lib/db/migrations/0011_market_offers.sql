-- Fase 3.2: ofertas de precio en hilos de marketplace (proponer / aceptar / rechazar / contraoferta).

CREATE TABLE public.market_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  market_intention_id uuid NOT NULL REFERENCES public.market_intentions (id) ON DELETE RESTRICT,
  from_user_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  price_cents integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  parent_offer_id uuid REFERENCES public.market_offers (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT market_offers_status_check CHECK (
    status IN ('pending', 'accepted', 'rejected', 'superseded')
  ),
  CONSTRAINT market_offers_currency_check CHECK (currency IN ('ARS', 'USD', 'COP', 'EUR')),
  CONSTRAINT market_offers_price_check CHECK (
    price_cents >= 50
    AND price_cents <= 100000000
  ),
  CONSTRAINT market_offers_from_ne_to CHECK (from_user_id <> to_user_id)
);

CREATE UNIQUE INDEX market_offers_one_pending_per_conversation_idx ON public.market_offers (conversation_id)
WHERE
  status = 'pending';

CREATE INDEX market_offers_conversation_created_idx ON public.market_offers (conversation_id, created_at DESC);

ALTER TABLE public.market_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_offers_select_parties" ON public.market_offers;

DROP POLICY IF EXISTS "market_offers_insert_from_peer" ON public.market_offers;

DROP POLICY IF EXISTS "market_offers_update_recipient_decision" ON public.market_offers;

DROP POLICY IF EXISTS "market_offers_update_supersede_pending" ON public.market_offers;

CREATE POLICY "market_offers_select_parties" ON public.market_offers FOR
SELECT TO authenticated USING (
  auth.uid() = from_user_id
  OR auth.uid() = to_user_id
);

CREATE POLICY "market_offers_insert_from_peer" ON public.market_offers FOR
INSERT TO authenticated WITH CHECK (
  auth.uid() = from_user_id
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE
      c.id = conversation_id
      AND c.market_intention_id = market_intention_id
      AND (
        (
          c.user_a = from_user_id
          AND c.user_b = to_user_id
        )
        OR (
          c.user_b = from_user_id
          AND c.user_a = to_user_id
        )
      )
      AND (
        c.user_a = auth.uid()
        OR c.user_b = auth.uid()
      )
  )
);

CREATE POLICY "market_offers_update_recipient_decision" ON public.market_offers FOR
UPDATE TO authenticated USING (
  auth.uid() = to_user_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = to_user_id
  AND status IN ('accepted', 'rejected')
);

CREATE POLICY "market_offers_update_supersede_pending" ON public.market_offers FOR
UPDATE TO authenticated USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE
      c.id = market_offers.conversation_id
      AND (
        c.user_a = auth.uid()
        OR c.user_b = auth.uid()
      )
  )
)
WITH CHECK (status = 'superseded');
