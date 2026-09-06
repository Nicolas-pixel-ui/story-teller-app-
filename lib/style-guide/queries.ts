import { db } from "@/lib/db";
import { styleGuides } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/** Server-only query helper — not a Server Action. Call only after auth. */
export async function getStyleGuidesForUser(userId: string) {
  return db
    .select()
    .from(styleGuides)
    .where(eq(styleGuides.userId, userId))
    .orderBy(desc(styleGuides.updatedAt));
}
