import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { withPostgresOrSupabase } from "@/lib/db/postgres-or-supabase";
import {
  getSupabaseClientForUserData,
  getUserProfileViaSupabase,
  type UserProfileRow,
} from "@/lib/db/supabase-fallback";

export type EnsureProfileInput = {
  id: string;
  email: string;
  displayName?: string | null;
};

function mapUserRow(row: typeof users.$inferSelect): UserProfileRow {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    preferences: row.preferences,
    analytics: row.analytics,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function ensureViaPostgres(input: EnsureProfileInput): Promise<UserProfileRow> {
  const [existing] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
  if (existing) {
    return mapUserRow(existing);
  }

  const now = new Date();
  await db
    .insert(users)
    .values({
      id: input.id,
      email: input.email,
      displayName: input.displayName ?? null,
      preferences: {},
      analytics: {},
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  const [created] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
  if (!created) {
    throw new Error("Failed to create user profile");
  }

  return mapUserRow(created);
}

async function ensureViaSupabase(input: EnsureProfileInput): Promise<UserProfileRow> {
  const existing = await getUserProfileViaSupabase(input.id);
  if (existing) {
    return existing;
  }

  const supabase = await getSupabaseClientForUserData(input.id);
  const now = new Date().toISOString();
  const { error } = await supabase.from("users").insert({
    id: input.id,
    email: input.email,
    display_name: input.displayName ?? null,
    preferences: {},
    analytics: {},
    created_at: now,
    updated_at: now,
  });

  if (error && error.code !== "23505") {
    throw error;
  }

  const profile = await getUserProfileViaSupabase(input.id);
  if (!profile) {
    throw new Error("Failed to create user profile");
  }

  return profile;
}

/** Ensures a row exists in public.users for the signed-in auth user. */
export async function ensureUserProfile(input: EnsureProfileInput): Promise<UserProfileRow> {
  if (!input.email?.trim()) {
    throw new Error("Email is required to create a user profile");
  }

  return withPostgresOrSupabase(
    () => ensureViaPostgres(input),
    () => ensureViaSupabase(input)
  );
}

type AuthUserForProfile = {
  id: string;
  email?: string | null;
  user_metadata?: {
    display_name?: unknown;
  } | null;
};

/** Best-effort profile create after login. Never throws — login must still succeed. */
export async function ensureUserProfileFromAuthUser(
  user: AuthUserForProfile | null | undefined
): Promise<void> {
  if (!user?.id || !user.email?.trim()) {
    return;
  }

  try {
    await ensureUserProfile({
      id: user.id,
      email: user.email,
      displayName:
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : null,
    });
  } catch (error) {
    console.error("[auth] Failed to ensure user profile after login", error);
  }
}
