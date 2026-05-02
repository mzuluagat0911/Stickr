-- Fase 3.3: cierre bilateral de acuerdos de marketplace (sin pagos) + reseñas ligadas al deal.

CREATE TABLE public.market_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  market_intention_id uuid NOT NULL REFERENCES public.market_intentions (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'open',
  user_a_completed_at timestamptz,
  user_b_completed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_deals_conversation_id_key UNIQUE (conversation_id),
  CONSTRAINT market_deals_status_check CHECK (status IN ('open', 'completed', 'cancelled'))
);

CREATE INDEX market_deals_status_idx ON public.market_deals (status);

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS market_deal_id uuid REFERENCES public.market_deals (id) ON DELETE SET NULL;

ALTER TABLE public.reviews
DROP CONSTRAINT IF EXISTS reviews_context_check;

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_context_check CHECK (
  (
    CASE
      WHEN trade_id IS NOT NULL THEN 1
      ELSE 0
    END
  ) + (
    CASE
      WHEN order_id IS NOT NULL THEN 1
      ELSE 0
    END
  ) + (
    CASE
      WHEN market_deal_id IS NOT NULL THEN 1
      ELSE 0
    END
  ) = 1
);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_market_deal_reviewer_uidx ON public.reviews (market_deal_id, reviewer_id)
WHERE
  market_deal_id IS NOT NULL;

INSERT INTO public.market_deals (conversation_id, market_intention_id, status)
SELECT c.id, c.market_intention_id, 'open'
FROM public.conversations c
WHERE
  c.market_intention_id IS NOT NULL
ON CONFLICT (conversation_id) DO NOTHING;

ALTER TABLE public.market_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_deals_select_participant" ON public.market_deals;

CREATE POLICY "market_deals_select_participant" ON public.market_deals FOR
SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE
      c.id = market_deals.conversation_id
      AND (
        c.user_a = auth.uid()
        OR c.user_b = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "market_deals_insert_participant" ON public.market_deals;

CREATE POLICY "market_deals_insert_participant" ON public.market_deals FOR
INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE
      c.id = conversation_id
      AND c.market_intention_id = market_intention_id
      AND (
        c.user_a = auth.uid()
        OR c.user_b = auth.uid()
      )
  )
);

--> Confirmación bilateral: marca tu lado; al segundo, cierra deal y +1 trades_completed a cada uno.
CREATE OR REPLACE FUNCTION public.confirm_market_deal_completion(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  c RECORD;
  d RECORD;
  my_is_a boolean;
  v_rc int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT id, user_a, user_b, market_intention_id
  INTO c
  FROM public.conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  IF c.market_intention_id IS NULL THEN
    RAISE EXCEPTION 'not a marketplace thread';
  END IF;

  IF uid <> c.user_a
  AND uid <> c.user_b THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  SELECT * INTO d FROM public.market_deals WHERE conversation_id = p_conversation_id;

  IF NOT FOUND THEN
    INSERT INTO public.market_deals (conversation_id, market_intention_id, status)
    VALUES (p_conversation_id, c.market_intention_id, 'open');

    SELECT * INTO d FROM public.market_deals WHERE conversation_id = p_conversation_id;
  END IF;

  IF d.status = 'completed' THEN
    RETURN jsonb_build_object('ok', true, 'already_complete', true);
  END IF;

  IF d.status <> 'open' THEN
    RAISE EXCEPTION 'deal not confirmable';
  END IF;

  my_is_a := (uid = c.user_a);

  IF my_is_a THEN
    IF d.user_a_completed_at IS NULL THEN
      UPDATE public.market_deals
      SET
        user_a_completed_at = now()
      WHERE
        id = d.id;
    END IF;
  ELSE
    IF d.user_b_completed_at IS NULL THEN
      UPDATE public.market_deals
      SET
        user_b_completed_at = now()
      WHERE
        id = d.id;
    END IF;
  END IF;

  SELECT * INTO d FROM public.market_deals WHERE id = d.id;

  IF d.user_a_completed_at IS NOT NULL
  AND d.user_b_completed_at IS NOT NULL THEN
    UPDATE public.market_deals
    SET
      status = 'completed',
      completed_at = now()
    WHERE
      id = d.id
      AND status = 'open'
      AND user_a_completed_at IS NOT NULL
      AND user_b_completed_at IS NOT NULL;

    GET DIAGNOSTICS v_rc = ROW_COUNT;

    IF v_rc = 1 THEN
      UPDATE public.user_profiles
      SET
        trades_completed = trades_completed + 1
      WHERE
        id = c.user_a;

      UPDATE public.user_profiles
      SET
        trades_completed = trades_completed + 1
      WHERE
        id = c.user_b;

      RETURN jsonb_build_object('ok', true, 'now_complete', true);
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'now_complete', false);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_market_deal_completion(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.confirm_market_deal_completion(uuid) TO authenticated;

--> Reseña tras deal completado (actualiza rating del reviewee).
CREATE OR REPLACE FUNCTION public.submit_market_deal_review(
  p_conversation_id uuid,
  p_rating integer,
  p_review_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  c RECORD;
  d RECORD;
  peer uuid;
  txt text;
  cnt int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_rating < 1
  OR p_rating > 5 THEN
    RAISE EXCEPTION 'rating out of range';
  END IF;

  txt := trim(both from coalesce(p_review_text, ''));

  IF txt = '' THEN
    txt := NULL;
  END IF;

  IF txt IS NOT NULL
  AND char_length(txt) > 280 THEN
    RAISE EXCEPTION 'review text too long';
  END IF;

  SELECT id, user_a, user_b
  INTO c
  FROM public.conversations
  WHERE
    id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  IF uid <> c.user_a
  AND uid <> c.user_b THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  SELECT * INTO d FROM public.market_deals WHERE conversation_id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no deal';
  END IF;

  IF d.status <> 'completed' THEN
    RAISE EXCEPTION 'deal not complete';
  END IF;

  peer := CASE
    WHEN uid = c.user_a THEN c.user_b
    ELSE c.user_a
  END;

  SELECT COUNT(*) INTO cnt
  FROM public.reviews
  WHERE
    market_deal_id = d.id
    AND reviewer_id = uid;

  IF cnt > 0 THEN
    RAISE EXCEPTION 'already reviewed';
  END IF;

  INSERT INTO public.reviews (
    reviewer_id,
    reviewee_id,
    rating,
    review_text,
    market_deal_id,
    trade_id,
    order_id
  )
  VALUES (uid, peer, p_rating, txt, d.id, NULL, NULL);

  UPDATE public.user_profiles
  SET
    rating_count = rating_count + 1,
    rating_avg = ROUND(
      (
        COALESCE(rating_avg, 0)::numeric * rating_count + p_rating::numeric
      ) / (rating_count + 1),
      2
    )
  WHERE
    id = peer;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_market_deal_review(uuid, integer, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_market_deal_review(uuid, integer, text) TO authenticated;
