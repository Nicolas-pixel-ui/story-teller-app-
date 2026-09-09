import { db } from "@/lib/db";
import { dictionaryEntries, styleGuides } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

/** Server-only query helper — not a Server Action. Call only after auth. */
export async function getStyleGuidesForUser(userId: string) {
  return db
    .select()
    .from(styleGuides)
    .where(eq(styleGuides.userId, userId))
    .orderBy(desc(styleGuides.updatedAt));
}

export async function getPublicStyleGuideByToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const guide = await db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.shareToken, trimmed), eq(styleGuides.isPublic, true)),
  });
  if (!guide) return null;

  const dictionary = await db.query.dictionaryEntries.findMany({
    where: eq(dictionaryEntries.styleGuideId, guide.id),
    orderBy: [desc(dictionaryEntries.createdAt)],
  });

  return { guide, dictionary };
}
