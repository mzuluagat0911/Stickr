-- Fase 3.1: un hilo de mensajes por par de usuarios + publicación de marketplace.

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS market_intention_id uuid REFERENCES public.market_intentions (id) ON DELETE SET NULL;

ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS conversations_user_a_user_b;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_general_uidx ON public.conversations (
  user_a,
  user_b
)
WHERE
  market_intention_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_market_uidx ON public.conversations (
  user_a,
  user_b,
  market_intention_id
)
WHERE
  market_intention_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS conversations_market_intention_id_idx ON public.conversations (market_intention_id)
WHERE
  market_intention_id IS NOT NULL;

--> RLS: conversaciones solo entre participantes
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;

DROP POLICY IF EXISTS "conversations_insert_participant" ON public.conversations;

DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;

CREATE POLICY "conversations_select_participant" ON public.conversations FOR
SELECT TO authenticated USING (
  auth.uid() = user_a
  OR auth.uid() = user_b
);

CREATE POLICY "conversations_insert_participant" ON public.conversations FOR
INSERT TO authenticated WITH CHECK (
  auth.uid() = user_a
  OR auth.uid() = user_b
);

CREATE POLICY "conversations_update_participant" ON public.conversations FOR
UPDATE TO authenticated USING (
  auth.uid() = user_a
  OR auth.uid() = user_b
)
WITH CHECK (
  auth.uid() = user_a
  OR auth.uid() = user_b
);

--> RLS: mensajes solo en conversaciones donde participas
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_in_my_conversations" ON public.messages;

DROP POLICY IF EXISTS "messages_insert_as_participant" ON public.messages;

CREATE POLICY "messages_select_in_my_conversations" ON public.messages FOR
SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE
      c.id = messages.conversation_id
      AND (
        c.user_a = auth.uid()
        OR c.user_b = auth.uid()
      )
  )
);

CREATE POLICY "messages_insert_as_participant" ON public.messages FOR
INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE
      c.id = messages.conversation_id
      AND (
        c.user_a = auth.uid()
        OR c.user_b = auth.uid()
      )
  )
);
