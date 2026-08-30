-- Atomic credit debit for authenticated users when direct Postgres is unavailable.
-- Mirrors lib/credits/service.ts consumeCredit + daily refill behavior.

CREATE OR REPLACE FUNCTION public.consume_user_credit(
  p_reason text,
  p_request_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_amount integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_day_start timestamptz;
  v_existing_id uuid;
  v_balance integer;
  v_new_balance integer;
  v_quota integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'UNAUTHORIZED',
      'message', 'Not authenticated',
      'balance', 0
    );
  END IF;

  v_day_start := (date_trunc('day', (now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC');

  INSERT INTO public.user_credits (
    user_id,
    balance,
    monthly_free_quota,
    monthly_used,
    period_start,
    updated_at
  )
  VALUES (v_user_id, 140, 140, 0, v_day_start, now())
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
  SET
    balance = monthly_free_quota,
    monthly_used = 0,
    period_start = v_day_start,
    updated_at = now()
  WHERE user_id = v_user_id
    AND period_start < v_day_start
  RETURNING monthly_free_quota INTO v_quota;

  IF FOUND THEN
    INSERT INTO public.credit_transactions (user_id, type, amount, reason, metadata)
    VALUES (
      v_user_id,
      'refill',
      v_quota,
      'daily_refill',
      jsonb_build_object('periodStart', v_day_start)
    );
  END IF;

  IF p_request_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.credit_transactions
    WHERE user_id = v_user_id
      AND request_id = p_request_id
      AND type = 'debit'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      SELECT balance INTO v_balance
      FROM public.user_credits
      WHERE user_id = v_user_id;

      RETURN jsonb_build_object(
        'ok', true,
        'balance', COALESCE(v_balance, 0),
        'already_consumed', true
      );
    END IF;
  END IF;

  UPDATE public.user_credits
  SET
    balance = balance - p_amount,
    monthly_used = monthly_used + p_amount,
    updated_at = now()
  WHERE user_id = v_user_id
    AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    SELECT balance INTO v_balance
    FROM public.user_credits
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_CREDITS',
      'message', 'You do not have enough credits. Please try again tomorrow.',
      'balance', COALESCE(v_balance, 0)
    );
  END IF;

  INSERT INTO public.credit_transactions (
    user_id,
    type,
    amount,
    reason,
    request_id,
    metadata
  )
  VALUES (
    v_user_id,
    'debit',
    -p_amount,
    p_reason,
    p_request_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
EXCEPTION
  WHEN unique_violation THEN
    SELECT balance INTO v_balance
    FROM public.user_credits
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
      'ok', true,
      'balance', COALESCE(v_balance, 0),
      'already_consumed', true
    );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_user_credit(text, text, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_user_credit(text, text, jsonb, integer) TO authenticated;
