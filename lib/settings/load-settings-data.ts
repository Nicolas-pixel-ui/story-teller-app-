import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { creditTransactions } from "@/lib/db/schema";
import { withPostgresOrSupabase } from "@/lib/db/postgres-or-supabase";
import {
  getRecentCreditTransactionsViaSupabase,
  type CreditTransactionRow,
  type UserProfileRow,
} from "@/lib/db/supabase-fallback";
import { ensureUserProfile, type EnsureProfileInput } from "@/lib/users/ensure-profile";

export type SettingsPageData = {
  profile: UserProfileRow;
  recentCreditTransactions: CreditTransactionRow[];
};

export async function loadSettingsPageData(
  userId: string,
  auth: EnsureProfileInput
): Promise<SettingsPageData> {
  const profile = await ensureUserProfile(auth);

  const recentCreditTransactions = await withPostgresOrSupabase(
    async () => {
      const rows = await db
        .select({
          id: creditTransactions.id,
          type: creditTransactions.type,
          amount: creditTransactions.amount,
          reason: creditTransactions.reason,
          createdAt: creditTransactions.createdAt,
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(20);

      return rows.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        reason: tx.reason,
        createdAt: tx.createdAt,
      }));
    },
    () => getRecentCreditTransactionsViaSupabase(userId)
  );

  return { profile, recentCreditTransactions };
}
