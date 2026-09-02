import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { getSupabaseClientForAdminOperations } from "@/lib/db/supabase-fallback";
import type { AdminUsageStats, RecentSignup } from "./usage-queries";
import { isExcludedFromUsageMetrics } from "./usage-excluded-accounts";

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function minutesAgoIso(minutes: number): string {
  const d = new Date();
  d.setUTCMinutes(d.getUTCMinutes() - minutes);
  return d.toISOString();
}

type ListedUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
};

async function listAllAuthUsers(supabase: SupabaseClient): Promise<ListedUser[]> {
  const users: ListedUser[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) {
      break;
    }
    page += 1;
  }

  return users;
}

async function listAllPublicUsers(supabase: SupabaseClient): Promise<ListedUser[]> {
  const users: ListedUser[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const batch = data ?? [];
    users.push(
      ...batch.map((row) => ({
        id: row.id,
        email: row.email,
        created_at: row.created_at,
        last_sign_in_at: null,
      }))
    );

    if (batch.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return users;
}

async function listUsersForMetrics(supabase: SupabaseClient): Promise<ListedUser[]> {
  const users = getServiceRoleClient()
    ? await listAllAuthUsers(supabase)
    : await listAllPublicUsers(supabase);
  return users.filter((u) => !isExcludedFromUsageMetrics(u.email));
}

async function distinctUserIdsSince(
  supabase: SupabaseClient,
  table: "stories" | "credit_transactions",
  sinceIso: string
): Promise<Set<string>> {
  const ids = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const dateColumn = table === "stories" ? "updated_at" : "created_at";
    const { data, error } = await supabase
      .from(table)
      .select("user_id")
      .gte(dateColumn, sinceIso)
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    for (const row of rows) {
      if (row.user_id) {
        ids.add(row.user_id);
      }
    }

    if (rows.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return ids;
}

function mergeActiveUserCounts(countedUserIds: Set<string>, ...sets: Set<string>[]): number {
  const merged = new Set<string>();
  for (const set of sets) {
    for (const id of set) {
      if (countedUserIds.has(id)) {
        merged.add(id);
      }
    }
  }
  return merged.size;
}

export async function getAdminUsageStatsViaSupabase(): Promise<AdminUsageStats> {
  const supabase = await getSupabaseClientForAdminOperations();
  const hasServiceRole = Boolean(getServiceRoleClient());
  const users = await listUsersForMetrics(supabase);
  const countedUserIds = new Set(users.map((u) => u.id));
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7d = daysAgoIso(7);
  const since30d = daysAgoIso(30);
  const since15m = minutesAgoIso(15);

  let newUsers7d = 0;
  let newUsers30d = 0;
  let recentlyOnlineUsers = 0;

  for (const user of users) {
    const created = user.created_at ? new Date(user.created_at).getTime() : 0;
    if (created >= new Date(since7d).getTime()) {
      newUsers7d += 1;
    }
    if (created >= new Date(since30d).getTime()) {
      newUsers30d += 1;
    }
    if (hasServiceRole) {
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
      if (lastSignIn >= new Date(since15m).getTime()) {
        recentlyOnlineUsers += 1;
      }
    }
  }

  const [stories24h, credits24h, stories7d, credits7d, stories30d, credits30d] = await Promise.all([
    distinctUserIdsSince(supabase, "stories", since24h),
    distinctUserIdsSince(supabase, "credit_transactions", since24h),
    distinctUserIdsSince(supabase, "stories", since7d),
    distinctUserIdsSince(supabase, "credit_transactions", since7d),
    distinctUserIdsSince(supabase, "stories", since30d),
    distinctUserIdsSince(supabase, "credit_transactions", since30d),
  ]);

  const { count: totalStories, error: storiesCountError } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true });
  if (storiesCountError) {
    throw storiesCountError;
  }

  const { count: totalAiGenerations, error: aiTotalError } = await supabase
    .from("credit_transactions")
    .select("*", { count: "exact", head: true })
    .eq("type", "debit");
  if (aiTotalError) {
    throw aiTotalError;
  }

  const { count: aiGenerations7d, error: ai7dError } = await supabase
    .from("credit_transactions")
    .select("*", { count: "exact", head: true })
    .eq("type", "debit")
    .gte("created_at", since7d);
  if (ai7dError) {
    throw ai7dError;
  }

  return {
    totalUsers: users.length,
    newUsers7d,
    newUsers30d,
    activeUsers24h: mergeActiveUserCounts(countedUserIds, stories24h, credits24h),
    activeUsers7d: mergeActiveUserCounts(countedUserIds, stories7d, credits7d),
    activeUsers30d: mergeActiveUserCounts(countedUserIds, stories30d, credits30d),
    recentlyOnlineUsers,
    totalStories: totalStories ?? 0,
    totalAiGenerations: totalAiGenerations ?? 0,
    aiGenerations7d: aiGenerations7d ?? 0,
  };
}

export async function getRecentSignupsViaSupabase(limit = 15): Promise<RecentSignup[]> {
  const supabase = await getSupabaseClientForAdminOperations();
  const users = await listUsersForMetrics(supabase);

  return users
    .filter((u) => u.created_at && u.email)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    .slice(0, limit)
    .map((u) => ({
      id: u.id,
      email: u.email!,
      createdAt: new Date(u.created_at!),
    }));
}
