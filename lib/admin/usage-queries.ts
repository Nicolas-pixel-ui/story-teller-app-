import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { shouldPreferSupabaseOverPostgres } from "@/lib/db/pooling-url-health";
import { isDirectPostgresConnectionError } from "@/lib/db/supabase-fallback";
import {
  getAdminUsageStatsViaSupabase,
  getRecentSignupsViaSupabase,
} from "./usage-queries-supabase";
import { USAGE_METRICS_EXCLUDED_EMAILS } from "./usage-excluded-accounts";
import {
  mapAdminUsageStatsRow,
  type AdminUsageStats,
  type RecentSignup,
} from "./usage-stats";

export {
  EMPTY_ADMIN_USAGE_STATS,
  mapAdminUsageStatsRow,
  type AdminUsageStats,
  type RecentSignup,
} from "./usage-stats";

/** `auth.users` rows minus the owner/test accounts hidden from metrics. */
const countedUsers = sql`(
  SELECT id, created_at, last_sign_in_at, email
  FROM auth.users
  WHERE coalesce(lower(email), '') NOT IN ${USAGE_METRICS_EXCLUDED_EMAILS}
)`;

async function getAdminUsageStatsViaPostgres(): Promise<AdminUsageStats> {
  const [row] = await db.execute<Record<string, unknown>>(sql`
    WITH counted AS (
      SELECT id, created_at, last_sign_in_at, email FROM ${countedUsers} u
    ),
    story_users AS (
      SELECT DISTINCT s.user_id
      FROM public.stories s
      WHERE s.user_id IN (SELECT id FROM counted)
    ),
    style_guide_users AS (
      SELECT DISTINCT g.user_id
      FROM public.style_guides g
      WHERE g.user_id IN (SELECT id FROM counted)
    ),
    both_users AS (
      SELECT user_id FROM story_users
      INTERSECT
      SELECT user_id FROM style_guide_users
    )
    SELECT
      (SELECT count(*)::int FROM counted) AS total_users,
      (SELECT count(*)::int FROM counted WHERE created_at >= now() - interval '7 days') AS new_users_7d,
      (SELECT count(*)::int FROM counted WHERE created_at >= now() - interval '30 days') AS new_users_30d,
      (
        SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM public.stories WHERE updated_at >= now() - interval '24 hours'
          UNION
          SELECT user_id FROM public.credit_transactions WHERE created_at >= now() - interval '24 hours'
        ) active
        WHERE user_id IN (SELECT id FROM counted)
      ) AS active_users_24h,
      (
        SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM public.stories WHERE updated_at >= now() - interval '7 days'
          UNION
          SELECT user_id FROM public.credit_transactions WHERE created_at >= now() - interval '7 days'
        ) active
        WHERE user_id IN (SELECT id FROM counted)
      ) AS active_users_7d,
      (
        SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM public.stories WHERE updated_at >= now() - interval '30 days'
          UNION
          SELECT user_id FROM public.credit_transactions WHERE created_at >= now() - interval '30 days'
        ) active
        WHERE user_id IN (SELECT id FROM counted)
      ) AS active_users_30d,
      (
        SELECT count(*)::int FROM counted
        WHERE last_sign_in_at >= now() - interval '15 minutes'
      ) AS recently_online_users,
      (SELECT count(*)::int FROM public.stories) AS total_stories,
      (SELECT count(*)::int FROM public.credit_transactions WHERE type = 'debit') AS total_ai_generations,
      (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit' AND created_at >= now() - interval '7 days'
      ) AS ai_generations_7d,
      (SELECT count(*)::int FROM story_users) AS users_with_stories,
      (SELECT count(*)::int FROM style_guide_users) AS users_with_style_guides,
      (SELECT count(*)::int FROM both_users) AS users_with_both,
      (
        SELECT count(*)::int FROM story_users
        WHERE user_id NOT IN (SELECT user_id FROM style_guide_users)
      ) AS users_stories_only,
      (
        SELECT count(*)::int FROM style_guide_users
        WHERE user_id NOT IN (SELECT user_id FROM story_users)
      ) AS users_style_guides_only,
      (
        (SELECT count(*)::int FROM counted)
        - (
          SELECT count(DISTINCT user_id)::int FROM (
            SELECT user_id FROM story_users
            UNION
            SELECT user_id FROM style_guide_users
          ) product_users
        )
      ) AS users_with_neither,
      (SELECT count(*)::int FROM public.style_guides) AS total_style_guides,
      (
        SELECT count(*)::int FROM public.stories WHERE style_guide_id IS NOT NULL
      ) AS stories_that_used_style_guide,
      (
        SELECT count(DISTINCT user_id)::int FROM public.stories
        WHERE user_id IN (SELECT id FROM counted)
          AND (created_at >= now() - interval '7 days' OR updated_at >= now() - interval '7 days')
      ) AS story_users_7d,
      (
        SELECT count(DISTINCT user_id)::int FROM public.style_guides
        WHERE user_id IN (SELECT id FROM counted)
          AND (created_at >= now() - interval '7 days' OR updated_at >= now() - interval '7 days')
      ) AS style_guide_users_7d,
      (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit' AND reason NOT LIKE 'style_analyze_%'
      ) AS story_ai_generations,
      (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit' AND reason LIKE 'style_analyze_%'
      ) AS style_guide_ai_generations,
      (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit'
          AND reason NOT LIKE 'style_analyze_%'
          AND created_at >= now() - interval '7 days'
      ) AS story_ai_generations_7d,
      (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit'
          AND reason LIKE 'style_analyze_%'
          AND created_at >= now() - interval '7 days'
      ) AS style_guide_ai_generations_7d
  `);

  return mapAdminUsageStatsRow(row);
}

async function getRecentSignupsViaPostgres(limit = 15): Promise<RecentSignup[]> {
  const rows = await db.execute<{
    id: string;
    email: string;
    created_at: Date;
  }>(sql`
    SELECT u.id, u.email, u.created_at
    FROM ${countedUsers} u
    WHERE u.email IS NOT NULL
    ORDER BY u.created_at DESC
    LIMIT ${limit}
  `);

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    createdAt: new Date(row.created_at),
  }));
}

export async function getAdminUsageStats(): Promise<AdminUsageStats> {
  if (shouldPreferSupabaseOverPostgres()) {
    return getAdminUsageStatsViaSupabase();
  }

  try {
    return await getAdminUsageStatsViaPostgres();
  } catch (error) {
    if (isDirectPostgresConnectionError(error)) {
      return getAdminUsageStatsViaSupabase();
    }
    throw error;
  }
}

export async function getRecentSignups(limit = 15): Promise<RecentSignup[]> {
  if (shouldPreferSupabaseOverPostgres()) {
    return getRecentSignupsViaSupabase(limit);
  }

  try {
    return await getRecentSignupsViaPostgres(limit);
  } catch (error) {
    if (isDirectPostgresConnectionError(error)) {
      return getRecentSignupsViaSupabase(limit);
    }
    throw error;
  }
}
