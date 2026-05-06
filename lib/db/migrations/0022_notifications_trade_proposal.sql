-- Solicitud de intercambio: fila en notifications para el peer al enviar la propuesta inicial.
-- Correo transaccional no está en Postgres: en Supabase podés usar Database Webhook (INSERT en
-- notifications WHERE type = 'trade_proposed') → Edge Function → Resend/SendGrid/Mailgun.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enqueue_trade_proposal_notification (
  p_conversation_id uuid,
  p_recipient_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'enqueue_trade_proposal_notification: no autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE
      c.id = p_conversation_id
      AND c.market_intention_id IS NULL
      AND (
        (c.user_a = auth.uid() AND c.user_b = p_recipient_id)
        OR (c.user_b = auth.uid() AND c.user_a = p_recipient_id)
      )
  ) THEN
    RAISE EXCEPTION 'enqueue_trade_proposal_notification: conversación o destinatario inválido';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    payload,
    created_at
  )
  VALUES (
    p_recipient_id,
    'trade_proposed',
    jsonb_build_object(
      'conversation_id',
      p_conversation_id,
      'from_user_id',
      auth.uid()
    ),
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_trade_proposal_notification (uuid, uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.enqueue_trade_proposal_notification (uuid, uuid)
TO authenticated;

COMMENT ON FUNCTION public.enqueue_trade_proposal_notification (uuid, uuid) IS
  'Inserta notificación trade_proposed para el peer en un hilo de intercambio (solo si auth.uid() participa).';

CREATE OR REPLACE FUNCTION public.mark_trade_proposal_notifications_read (
  p_conversation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'mark_trade_proposal_notifications_read: no autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE
      c.id = p_conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  ) THEN
    RAISE EXCEPTION 'mark_trade_proposal_notifications_read: sin acceso';
  END IF;

  UPDATE public.notifications n
  SET
    read_at = now()
  WHERE
    n.user_id = auth.uid()
    AND n.type = 'trade_proposed'
    AND n.read_at IS NULL
    AND n.payload ->> 'conversation_id' = p_conversation_id::text;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_trade_proposal_notifications_read (uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mark_trade_proposal_notifications_read (uuid)
TO authenticated;

COMMENT ON FUNCTION public.mark_trade_proposal_notifications_read (uuid) IS
  'Marca como leídas las notificaciones trade_proposed del usuario para ese conversation_id.';
