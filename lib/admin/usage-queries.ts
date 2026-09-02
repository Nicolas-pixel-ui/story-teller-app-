import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { shouldPreferSupabaseOverPostgres } from "@/lib/db/pooling-url-health";
import { isDirectPostgresConnectionError } from "@/lib/db/supabase-fallback";
import {
  getAdminUsageStatsViaSupabase,
  getRecentSignupsViaSupabase,
} from "./usage-queries-supabase";
import { USAGE_METRICS_EXCLUDED_EMAILS } from "./usage-excluded-accounts";

export type AdminUsageStats = {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  activeUsers24h: number;
  activeUsers7d: number;
  activeUsers30d: number;
  recentlyOnlineUsers: number;
  totalStories: number;
  totalAiGenerations: number;
  aiGenerations7d: number;
};

export type RecentSignup = {
  id: string;
  email: string;
  createdAt: Date;
};

function toCount(value: unknown): number {
  return Number(value ?? 0);
}

/** `auth.users` rows minus the owner/test accounts hidden from metrics. */
const countedUsers = sql`(
  SELECT id, created_at, last_sign_in_at, email
  FROM auth.users
  WHERE coalesce(lower(email), '') NOT IN ${USAGE_METRICS_EXCLUDED_EMAILS}
)`;

async function getAdminUsageStatsViaPostgres(): Promise<AdminUsageStats> {
  const [row] = await db.execute<{
    total_users: string;
    new_users_7d: string;
    new_users_30d: string;
    active_users_24h: string;
    active_users_7d: string;
    active_users_30d: string;
    recently_online_users: string;
    total_stories: string;
    total_ai_generations: string;
    ai_generations_7d: string;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM ${countedUsers} u) AS total_users,
      (SELECT count(*)::int FROM ${countedUsers} u WHERE u.created_at >= now() - interval '7 days') AS new_users_7d,
      (SELECT count(*)::int FROM ${countedUsers} u WHERE u.created_at >= now() - interval '30 days') AS new_users_30d,
      (
        SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM public.stories WHERE updated_at >= now() - interval '24 hours'
          UNION
          SELECT user_id FROM public.credit_transactions WHERE created_at >= now() - interval '24 hours'
        ) active
        WHERE user_id IN (SELECT id FROM ${countedUsers} u)
      ) AS active_users_24h,
      (
        SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM public.stories WHERE updated_at >= now() - interval '7 days'
          UNION
          SELECT user_id FROM public.credit_transactions WHERE created_at >= now() - interval '7 days'
        ) active
        WHERE user_id IN (SELECT id FROM ${countedUsers} u)
      ) AS active_users_7d,
      (
        SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM public.stories WHERE updated_at >= now() - interval '30 days'
          UNION
          SELECT user_id FROM public.credit_transactions WHERE created_at >= now() - interval '30 days'
        ) active
        WHERE user_id IN (SELECT id FROM ${countedUsers} u)
      ) AS active_users_30d,
      (
        SELECT count(*)::int FROM ${countedUsers} u
        WHERE u.last_sign_in_at >= now() - interval '15 minutes'
      ) AS recently_online_users,
      (SELECT count(*)::int FROM public.stories) AS total_stories,
      (SELECT count(*)::int FROM public.credit_transactions WHERE type = 'debit') AS total_ai_generations,
      (
        SELECT count(*)::int FROM public.credit_transactions
        WHERE type = 'debit' AND created_at >= now() - interval '7 days'
      ) AS ai_generations_7d
  `);

  return {
    totalUsers: toCount(row?.total_users),
    newUsers7d: toCount(row?.new_users_7d),
    newUsers30d: toCount(row?.new_users_30d),
    activeUsers24h: toCount(row?.active_users_24h),
    activeUsers7d: toCount(row?.active_users_7d),
    activeUsers30d: toCount(row?.active_users_30d),
    recentlyOnlineUsers: toCount(row?.recently_online_users),
    totalStories: toCount(row?.total_stories),
    totalAiGenerations: toCount(row?.total_ai_generations),
    aiGenerations7d: toCount(row?.ai_generations_7d),
  };
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
