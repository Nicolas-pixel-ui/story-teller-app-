-- Stories vs style-guide adoption metrics for /admin/usage.
-- Updates get_usage_admin_stats() so Vercel (PostgREST RPC) returns the split
-- without a working POOLING_DATABASE_URL, and lets the owner read style_guides
-- when falling back to table queries.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'style_guides'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'style_guides'
        AND policyname = 'style_guides_usage_admin_select'
    ) THEN
      CREATE POLICY "style_guides_usage_admin_select"
        ON "public"."style_guides"
        FOR SELECT
        USING (((select auth.jwt()) ->> 'email') = 'nicolas@hartmanns.net');
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_usage_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  owner_email constant text := 'nicolas@hartmanns.net';
  jwt_email text;
BEGIN
  jwt_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  IF jwt_email IS DISTINCT FROM owner_email THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH counted_users AS (
      SELECT id, created_at, last_sign_in_at, email
      FROM auth.users
      WHERE coalesce(lower(email), '') NOT IN (
        'nicolas@hartmanns.net',
        'nicolashartmann0205@gmail.com'
      )
    ),
    story_users AS (
      SELECT DISTINCT s.user_id
      FROM public.stories s
      WHERE s.user_id IN (SELECT id FROM counted_users)
    ),
    style_guide_users AS (
      SELECT DISTINCT g.user_id
      FROM public.style_guides g
      WHERE g.user_id IN (SELECT id FROM counted_users)
    ),
    both_users AS (
      SELECT user_id FROM story_users
      INTERSECT
      SELECT user_id FROM style_guide_users
    )
    SELECT jsonb_build_object(
      'total_users', (SELECT count(*)::int FROM counted_users),
      'new_users_7d', (
        SELECT count(*)::int FROM counted_users WHERE created_at >= now() - interval '7 days'
      ),
      'new_users_30d', (
        SELECT count(*)::int FROM counted_users WHERE created_at >= now() - interval '30 days'
      ),
      'active_users_24h', (
        SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM public.stories WHERE updated_at >= now() - interval '24 hours'
          UNION
          SELECT user_id FROM public.credit_transactions WHERE created_at >= now() - interval '24 hours'
        ) active
        WHERE user_id IN (SELECT id FROM counted_users)
      ),
      'active_users_7d', (
        SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM public.stories WHERE updated_at >= now() - interval '7 days'
          UNION
          SELECT user_id FROM public.credit_transactions WHERE created_at >= now() - interval '7 days'
        ) active
        WHERE user_id IN (SELECT id FROM counted_users)
      ),
      'active_users_30d', (
        SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM public.stories WHERE updated_at >= now() - interval '30 days'
          UNION
          SELECT user_id FROM public.credit_transactions WHERE created_at >= now() - interval '30 days'
        ) active
        WHERE user_id IN (SELECT id FROM counted_users)
      ),
      'recently_online_users', (
        SELECT count(*)::int FROM counted_users
        WHERE last_sign_in_at >= now() - interval '15 minutes'
      ),
      'total_stories', (SELECT count(*)::int FROM public.stories),
      'total_ai_generations', (
        SELECT count(*)::int FROM public.credit_transactions WHERE type = 'debit'
      ),
      'ai_generations_7d', (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit' AND created_at >= now() - interval '7 days'
      ),
      'users_with_stories', (SELECT count(*)::int FROM story_users),
      'users_with_style_guides', (SELECT count(*)::int FROM style_guide_users),
      'users_with_both', (SELECT count(*)::int FROM both_users),
      'users_stories_only', (
        SELECT count(*)::int FROM story_users
        WHERE user_id NOT IN (SELECT user_id FROM style_guide_users)
      ),
      'users_style_guides_only', (
        SELECT count(*)::int FROM style_guide_users
        WHERE user_id NOT IN (SELECT user_id FROM story_users)
      ),
      'users_with_neither', (
        (SELECT count(*)::int FROM counted_users)
        - (
          SELECT count(DISTINCT user_id)::int FROM (
            SELECT user_id FROM story_users
            UNION
            SELECT user_id FROM style_guide_users
          ) product_users
        )
      ),
      'total_style_guides', (SELECT count(*)::int FROM public.style_guides),
      'stories_that_used_style_guide', (
        SELECT count(*)::int FROM public.stories WHERE style_guide_id IS NOT NULL
      ),
      'story_users_7d', (
        SELECT count(DISTINCT user_id)::int FROM public.stories
        WHERE user_id IN (SELECT id FROM counted_users)
          AND (created_at >= now() - interval '7 days' OR updated_at >= now() - interval '7 days')
      ),
      'style_guide_users_7d', (
        SELECT count(DISTINCT user_id)::int FROM public.style_guides
        WHERE user_id IN (SELECT id FROM counted_users)
          AND (created_at >= now() - interval '7 days' OR updated_at >= now() - interval '7 days')
      ),
      'story_ai_generations', (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit' AND reason NOT LIKE 'style_analyze_%'
      ),
      'style_guide_ai_generations', (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit' AND reason LIKE 'style_analyze_%'
      ),
      'story_ai_generations_7d', (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit'
          AND reason NOT LIKE 'style_analyze_%'
          AND created_at >= now() - interval '7 days'
      ),
      'style_guide_ai_generations_7d', (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit'
          AND reason LIKE 'style_analyze_%'
          AND created_at >= now() - interval '7 days'
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_usage_admin_stats() TO authenticated;
