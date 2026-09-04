import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export type DashboardStats = {
  totalStories: number;
  totalWords: number;
  streak: number;
  completionRate: number;
};

export type DashboardStoryRow = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  mode: "quick" | "comprehensive" | null;
};

export async function getSupabaseClientForUserData(userId: string): Promise<SupabaseClient> {
  const anon = (await createClient()) as unknown as SupabaseClient;
  const {
    data: { user },
  } = await anon.auth.getUser();

  if (user?.id === userId) {
    return anon;
  }

  const service = getServiceRoleClient();
  if (service) {
    return service;
  }

  return anon;
}

/** Load dashboard metrics via PostgREST (works when POOLING_DATABASE_URL on Vercel is wrong). */
export async function getDashboardDataViaSupabase(
  userId: string
): Promise<{ stats: DashboardStats; recentStories: DashboardStoryRow[] }> {
  const supabase = await getSupabaseClientForUserData(userId);

  const { count: totalStories, error: countError } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    throw countError;
  }

  const { data: recentRows, error: recentError } = await supabase
    .from("stories")
    .select("id, title, description, updated_at, mode")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(3);

  if (recentError) {
    throw recentError;
  }

  const { data: storyIds, error: idsError } = await supabase
    .from("stories")
    .select("id")
    .eq("user_id", userId);

  if (idsError) {
    throw idsError;
  }

  let totalWords = 0;
  const ids = (storyIds ?? []).map((row) => row.id);
  if (ids.length > 0) {
    const { data: sceneRows, error: scenesError } = await supabase
      .from("scenes")
      .select("word_count")
      .in("story_id", ids);

    if (scenesError) {
      throw scenesError;
    }

    totalWords = (sceneRows ?? []).reduce(
      (sum, row) => sum + Number(row.word_count ?? 0),
      0
    );
  }

  return {
    stats: {
      totalStories: totalStories ?? 0,
      totalWords,
      streak: 0,
      completionRate: 0,
    },
    recentStories: (recentRows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      updatedAt: new Date(row.updated_at),
      mode: (row.mode as "quick" | "comprehensive" | null) ?? null,
    })),
  };
}

export async function getUserCreditBalanceViaSupabase(userId: string): Promise<number> {
  const supabase = await getSupabaseClientForUserData(userId);
  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.balance ?? 0;
}

export type UserStoryListRow = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
};

export async function getUserStoriesListViaSupabase(userId: string): Promise<UserStoryListRow[]> {
  const supabase = await getSupabaseClientForUserData(userId);
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title || "Untitled",
    description: row.description,
    createdAt: new Date(row.created_at),
  }));
}

export type UserProfileRow = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  preferences: unknown;
  analytics: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export async function getUserProfileViaSupabase(userId: string): Promise<UserProfileRow | null> {
  const supabase = await getSupabaseClientForUserData(userId);
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    preferences: data.preferences,
    analytics: data.analytics,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export type CreditTransactionRow = {
  id: string;
  type: string;
  amount: number;
  reason: string;
  createdAt: Date;
};

export async function getRecentCreditTransactionsViaSupabase(
  userId: string,
  limit = 20
): Promise<CreditTransactionRow[]> {
  const supabase = await getSupabaseClientForUserData(userId);
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("id, type, amount, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    reason: row.reason,
    createdAt: new Date(row.created_at),
  }));
}

export async function updateUserProfileViaSupabase(
  userId: string,
  fields: { displayName: string; bio: string }
): Promise<void> {
  const supabase = await getSupabaseClientForUserData(userId);
  const { error } = await supabase
    .from("users")
    .update({
      display_name: fields.displayName,
      bio: fields.bio,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

export async function adminGrantCreditsViaSupabase(
  userId: string,
  amount: number,
  reason = "admin_grant"
): Promise<number> {
  const supabase = await getSupabaseClientForAdminOperations();
  const now = new Date().toISOString();

  const { error: upsertError } = await supabase.from("user_credits").upsert(
    {
      user_id: userId,
      balance: 140,
      monthly_free_quota: 140,
      monthly_used: 0,
      period_start: now,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );
  if (upsertError) throw upsertError;

  const { data: current, error: currentError } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (currentError) throw currentError;

  const nextBalance = Number(current?.balance ?? 0) + amount;
  const { error: updateError } = await supabase
    .from("user_credits")
    .update({ balance: nextBalance, updated_at: now })
    .eq("user_id", userId);
  if (updateError) throw updateError;

  const { error: txError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    type: "admin_grant",
    amount,
    reason,
    metadata: {},
  });
  if (txError) throw txError;

  return nextBalance;
}

export async function adminResetCreditsToDailyQuotaViaSupabase(
  userId: string,
  reason = "admin_reset_daily_quota"
): Promise<number> {
  const supabase = await getSupabaseClientForAdminOperations();
  const now = new Date().toISOString();

  const { error: upsertError } = await supabase.from("user_credits").upsert(
    {
      user_id: userId,
      balance: 140,
      monthly_free_quota: 140,
      monthly_used: 0,
      period_start: now,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );
  if (upsertError) throw upsertError;

  const { error: updateError } = await supabase
    .from("user_credits")
    .update({
      balance: 140,
      monthly_free_quota: 140,
      monthly_used: 0,
      period_start: now,
      updated_at: now,
    })
    .eq("user_id", userId);
  if (updateError) throw updateError;

  const { error: txError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    type: "admin_grant",
    amount: 140,
    reason,
    metadata: { resetToDailyQuota: true, periodStart: now },
  });
  if (txError) throw txError;

  return 140;
}

/** Service role when configured; otherwise the signed-in session (owner RLS policies). */
export async function getSupabaseClientForAdminOperations(): Promise<SupabaseClient> {
  const service = getServiceRoleClient();
  if (service) {
    return service;
  }
  return (await createClient()) as unknown as SupabaseClient;
}

export type BlogPostAdminRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: Date;
};

export async function listBlogPostsAdminViaSupabase(): Promise<BlogPostAdminRow[]> {
  const supabase = await getSupabaseClientForAdminOperations();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, published_at")
    .order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    publishedAt: new Date(row.published_at),
  }));
}

export type FeedbackSubmissionRow = {
  id: string;
  email: string | null;
  category: string;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
};

export async function listFeedbackSubmissionsViaSupabase(): Promise<FeedbackSubmissionRow[]> {
  const supabase = await getSupabaseClientForAdminOperations();
  const { data, error } = await supabase
    .from("feedback_submissions")
    .select("id, email, category, subject, message, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: new Date(row.created_at),
  }));
}

export async function updateFeedbackStatusViaSupabase(id: string, status: string): Promise<void> {
  const supabase = await getSupabaseClientForAdminOperations();
  const { error } = await supabase
    .from("feedback_submissions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export type BlogPostSeoRow = {
  slug: string;
  title: string;
  seoTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  updatedAt: Date;
};

export async function listBlogPostSeoRowsViaSupabase(): Promise<BlogPostSeoRow[]> {
  const supabase = await getSupabaseClientForAdminOperations();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, seo_title, meta_description, canonical_url, updated_at")
    .order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    slug: row.slug,
    title: row.title,
    seoTitle: row.seo_title,
    metaDescription: row.meta_description,
    canonicalUrl: row.canonical_url,
    updatedAt: new Date(row.updated_at),
  }));
}

export async function updateBlogPostSeoViaSupabase(
  slug: string,
  fields: { seoTitle: string | null; metaDescription: string | null; canonicalUrl: string | null }
): Promise<boolean> {
  const supabase = await getSupabaseClientForAdminOperations();
  const { data, error } = await supabase
    .from("blog_posts")
    .update({
      seo_title: fields.seoTitle,
      meta_description: fields.metaDescription,
      canonical_url: fields.canonicalUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)
    .select("slug")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

function messageIncludesPostgresFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("failed query") ||
    lower.includes("password authentication") ||
    lower.includes("invalid url") ||
    lower.includes("database_not_configured") ||
    lower.includes("econnrefused") ||
    lower.includes("connect_timeout") ||
    lower.includes("127.0.0.1") ||
    lower.includes("tenant or user not found")
  );
}

export function isDirectPostgresConnectionError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      if (messageIncludesPostgresFailure(current.message)) {
        return true;
      }
      current = current.cause;
      continue;
    }
    if (typeof current === "object" && current !== null && "message" in current) {
      const msg = String((current as { message: unknown }).message);
      if (messageIncludesPostgresFailure(msg)) {
        return true;
      }
    }
    break;
  }

  return false;
}
