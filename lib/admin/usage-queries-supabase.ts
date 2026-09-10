import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { getSupabaseClientForAdminOperations } from "@/lib/db/supabase-fallback";
import {
  mapAdminUsageStatsRow,
  type AdminUsageStats,
  type RecentSignup,
} from "./usage-stats";
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

type UserIdPage = {
  data: { user_id?: string | null }[] | null;
  error: { message: string } | null;
};

async function paginatedUserIds(
  supabase: SupabaseClient,
  table: "stories" | "credit_transactions" | "style_guides",
  applyFilters: (query: any) => any
): Promise<Set<string>> {
  const ids = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error }: UserIdPage = await applyFilters(
      supabase.from(table).select("user_id")
    ).range(from, from + pageSize - 1);

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

async function distinctUserIdsSince(
  supabase: SupabaseClient,
  table: "stories" | "credit_transactions" | "style_guides",
  sinceIso: string,
  dateColumn: "updated_at" | "created_at" | "created_or_updated" = "created_at"
): Promise<Set<string>> {
  return paginatedUserIds(supabase, table, (query) => {
    if (dateColumn === "created_or_updated") {
      return query.or(`created_at.gte.${sinceIso},updated_at.gte.${sinceIso}`);
    }
    return query.gte(dateColumn, sinceIso);
  });
}

async function distinctUserIdsAll(
  supabase: SupabaseClient,
  table: "stories" | "style_guides"
): Promise<Set<string>> {
  return paginatedUserIds(supabase, table, (query) => query);
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

function intersectSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const id of a) {
    if (b.has(id)) {
      count += 1;
    }
  }
  return count;
}

function rpcHasProductSplit(row: Record<string, unknown>): boolean {
  return (
    "users_with_stories" in row &&
    "users_with_style_guides" in row &&
    "total_style_guides" in row
  );
}

async function tryGetAdminUsageStatsViaRpc(
  supabase: SupabaseClient
): Promise<AdminUsageStats | null> {
  const { data, error } = await supabase.rpc("get_usage_admin_stats");
  if (error || data == null) {
    return null;
  }
  const row =
    typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  if (!row || !rpcHasProductSplit(row)) {
    return null;
  }
  return mapAdminUsageStatsRow(row);
}

async function countExact(
  supabase: SupabaseClient,
  table: "stories" | "style_guides" | "credit_transactions",
  applyFilters: (query: any) => any
): Promise<number> {
  const { count, error } = await applyFilters(
    supabase.from(table).select("*", { count: "exact", head: true })
  );
  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function getAdminUsageStatsViaSupabase(): Promise<AdminUsageStats> {
  const supabase = await getSupabaseClientForAdminOperations();
  const hasServiceRole = Boolean(getServiceRoleClient());

  // Owner JWT on Vercel: one RPC round-trip. Service role has no user JWT, so the
  // RPC would 42501 — skip it and query tables instead.
  if (!hasServiceRole) {
    const fromRpc = await tryGetAdminUsageStatsViaRpc(supabase);
    if (fromRpc) {
      return fromRpc;
    }
  }

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

  const [
    stories24h,
    credits24h,
    stories7d,
    credits7d,
    stories30d,
    credits30d,
    storyUserIds,
    styleGuideUserIds,
    storyUsers7dIds,
    styleGuideUsers7dIds,
    totalStories,
    totalAiGenerations,
    aiGenerations7d,
    totalStyleGuides,
    storiesThatUsedStyleGuide,
    storyAiGenerations,
    styleGuideAiGenerations,
    storyAiGenerations7d,
    styleGuideAiGenerations7d,
  ] = await Promise.all([
    distinctUserIdsSince(supabase, "stories", since24h, "updated_at"),
    distinctUserIdsSince(supabase, "credit_transactions", since24h, "created_at"),
    distinctUserIdsSince(supabase, "stories", since7d, "updated_at"),
    distinctUserIdsSince(supabase, "credit_transactions", since7d, "created_at"),
    distinctUserIdsSince(supabase, "stories", since30d, "updated_at"),
    distinctUserIdsSince(supabase, "credit_transactions", since30d, "created_at"),
    distinctUserIdsAll(supabase, "stories"),
    distinctUserIdsAll(supabase, "style_guides"),
    distinctUserIdsSince(supabase, "stories", since7d, "created_or_updated"),
    distinctUserIdsSince(supabase, "style_guides", since7d, "created_or_updated"),
    countExact(supabase, "stories", (query) => query),
    countExact(supabase, "credit_transactions", (query) => query.eq("type", "debit")),
    countExact(supabase, "credit_transactions", (query) =>
      query.eq("type", "debit").gte("created_at", since7d)
    ),
    countExact(supabase, "style_guides", (query) => query),
    countExact(supabase, "stories", (query) => query.not("style_guide_id", "is", null)),
    countExact(supabase, "credit_transactions", (query) =>
      query.eq("type", "debit").not("reason", "like", "style_analyze_%")
    ),
    countExact(supabase, "credit_transactions", (query) =>
      query.eq("type", "debit").like("reason", "style_analyze_%")
    ),
    countExact(supabase, "credit_transactions", (query) =>
      query.eq("type", "debit").not("reason", "like", "style_analyze_%").gte("created_at", since7d)
    ),
    countExact(supabase, "credit_transactions", (query) =>
      query.eq("type", "debit").like("reason", "style_analyze_%").gte("created_at", since7d)
    ),
  ]);

  const countedStoryUsers = new Set(
    [...storyUserIds].filter((id) => countedUserIds.has(id))
  );
  const countedStyleGuideUsers = new Set(
    [...styleGuideUserIds].filter((id) => countedUserIds.has(id))
  );
  const usersWithBoth = intersectSize(countedStoryUsers, countedStyleGuideUsers);
  const usersStoriesOnly = countedStoryUsers.size - usersWithBoth;
  const usersStyleGuidesOnly = countedStyleGuideUsers.size - usersWithBoth;
  const usersWithNeither =
    users.length - (usersStoriesOnly + usersStyleGuidesOnly + usersWithBoth);

  return {
    totalUsers: users.length,
    newUsers7d,
    newUsers30d,
    activeUsers24h: mergeActiveUserCounts(countedUserIds, stories24h, credits24h),
    activeUsers7d: mergeActiveUserCounts(countedUserIds, stories7d, credits7d),
    activeUsers30d: mergeActiveUserCounts(countedUserIds, stories30d, credits30d),
    recentlyOnlineUsers,
    totalStories,
    totalAiGenerations,
    aiGenerations7d,
    usersWithStories: countedStoryUsers.size,
    usersWithStyleGuides: countedStyleGuideUsers.size,
    usersWithBoth,
    usersStoriesOnly,
    usersStyleGuidesOnly,
    usersWithNeither,
    totalStyleGuides,
    storiesThatUsedStyleGuide,
    storyUsers7d: mergeActiveUserCounts(countedUserIds, storyUsers7dIds),
    styleGuideUsers7d: mergeActiveUserCounts(countedUserIds, styleGuideUsers7dIds),
    storyAiGenerations,
    styleGuideAiGenerations,
    storyAiGenerations7d,
    styleGuideAiGenerations7d,
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
