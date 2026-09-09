"use server";

import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { styleGuides, dictionaryEntries } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getStyleGuidesForUser } from "@/lib/style-guide/queries";
import {
  asColorPalette,
  asLogoAssets,
  asSocialChannels,
  asStringArray,
  asTargetAudiences,
  asTypography,
  asValuePropositions,
  asWritingRules,
  isStyleGuideStatus,
  type StyleGuideStatus,
} from "@/lib/style-guide/types";

type StyleGuideInsert = typeof styleGuides.$inferInsert;

const UPDATABLE_KEYS = [
  "name",
  "title",
  "clientOrBrandName",
  "tagline",
  "isPublic",
  "status",
  "isDefault",
  "toneId",
  "writingStyleId",
  "perspectiveId",
  "toneDescription",
  "complexityLevel",
  "missionStatement",
  "valuePropositions",
  "targetAudiences",
  "toneAttributes",
  "writingRules",
  "preferredVocabulary",
  "bannedWords",
  "primaryColor",
  "secondaryColor",
  "tertiaryColor",
  "accentColor",
  "fontHeading",
  "fontBody",
  "colorPalette",
  "typography",
  "logoAssets",
  "imageryGuidelines",
  "socialChannels",
  "legalDisclaimers",
] as const;

function generateShareToken() {
  return randomBytes(18).toString("base64url");
}

function sanitizeStyleGuidePatch(data: Record<string, unknown>): Partial<StyleGuideInsert> {
  const patch: Partial<StyleGuideInsert> = {};

  for (const key of UPDATABLE_KEYS) {
    if (!(key in data)) continue;
    const value = data[key];

    switch (key) {
      case "name":
      case "title":
      case "clientOrBrandName":
        if (typeof value === "string") patch[key] = value;
        break;
      case "tagline":
      case "toneId":
      case "writingStyleId":
      case "perspectiveId":
      case "toneDescription":
      case "complexityLevel":
      case "missionStatement":
      case "primaryColor":
      case "secondaryColor":
      case "tertiaryColor":
      case "accentColor":
      case "fontHeading":
      case "fontBody":
      case "imageryGuidelines":
      case "legalDisclaimers":
        patch[key] = typeof value === "string" ? value : value == null ? null : String(value);
        break;
      case "isPublic":
      case "isDefault":
        patch[key] = Boolean(value);
        break;
      case "status":
        if (isStyleGuideStatus(value)) patch.status = value;
        break;
      case "valuePropositions":
        patch.valuePropositions = asValuePropositions(value);
        break;
      case "targetAudiences":
        patch.targetAudiences = asTargetAudiences(value);
        break;
      case "toneAttributes":
        patch.toneAttributes = asStringArray(value);
        break;
      case "writingRules":
        patch.writingRules = asWritingRules(value);
        break;
      case "preferredVocabulary":
        patch.preferredVocabulary = asStringArray(value);
        break;
      case "bannedWords":
        patch.bannedWords = asStringArray(value);
        break;
      case "colorPalette":
        patch.colorPalette = asColorPalette(value);
        break;
      case "typography":
        patch.typography = asTypography(value);
        break;
      case "logoAssets":
        patch.logoAssets = asLogoAssets(value);
        break;
      case "socialChannels":
        patch.socialChannels = asSocialChannels(value);
        break;
      default:
        break;
    }
  }

  const title = (patch.title ?? (typeof data.title === "string" ? data.title : "")).trim();
  const name = (patch.name ?? (typeof data.name === "string" ? data.name : "")).trim();
  const displayName = title || name;
  if (displayName) {
    patch.title = displayName;
    patch.name = displayName;
  }
  if (typeof patch.clientOrBrandName === "string") {
    patch.clientOrBrandName = patch.clientOrBrandName.trim() || displayName || patch.clientOrBrandName;
  }

  return patch;
}

export async function getStyleGuides() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return getStyleGuidesForUser(user.id);
}

export async function createStyleGuide(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  if (!name) throw new Error("Name is required");

  const uniqueName = await uniqueStyleGuideName(user.id, name);

  const newGuide = await db.insert(styleGuides).values({
    userId: user.id,
    name: uniqueName,
    title: uniqueName,
    clientOrBrandName: uniqueName,
    status: "draft",
    isPublic: false,
    toneId: "neutral",
    writingStyleId: "standard",
    perspectiveId: "third_limited",
    complexityLevel: "High School",
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
  }).returning();

  revalidatePath("/style-guide");
  revalidatePath("/dashboard");
  return newGuide[0];
}

async function uniqueStyleGuideName(userId: string, requestedName: string) {
  const existing = await db
    .select({ name: styleGuides.name })
    .from(styleGuides)
    .where(eq(styleGuides.userId, userId));
  const names = new Set(existing.map((guide) => guide.name));
  if (!names.has(requestedName)) return requestedName;

  let suffix = 2;
  let candidate = `${requestedName} ${suffix}`;
  while (names.has(candidate)) {
    suffix += 1;
    candidate = `${requestedName} ${suffix}`;
  }
  return candidate;
}

export async function deleteStyleGuide(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const guide = await db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.id, id), eq(styleGuides.userId, user.id)),
  });

  if (!guide) throw new Error("Style guide not found or unauthorized");

  await db.delete(styleGuides).where(eq(styleGuides.id, id));
  revalidatePath("/style-guide");
  revalidatePath("/dashboard");
}

export async function duplicateStyleGuide(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const guide = await db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.id, id), eq(styleGuides.userId, user.id)),
  });

  if (!guide) throw new Error("Style guide not found");

  const { id: _id, createdAt, updatedAt, name, title, shareToken: _shareToken, ...rest } = guide;
  const copyName = await uniqueStyleGuideName(user.id, `${title || name} (Copy)`);

  const newGuide = await db.insert(styleGuides).values({
    ...rest,
    name: copyName,
    title: copyName,
    clientOrBrandName: rest.clientOrBrandName || copyName,
    isPublic: false,
    shareToken: null,
    status: (rest.status as StyleGuideStatus | undefined) || "draft",
  }).returning();

  const entries = await db.query.dictionaryEntries.findMany({
    where: eq(dictionaryEntries.styleGuideId, id),
  });

  if (entries.length > 0) {
    await db.insert(dictionaryEntries).values(
      entries.map((entry) => ({
        styleGuideId: newGuide[0].id,
        term: entry.term,
        definition: entry.definition,
        usageGuidelines: entry.usageGuidelines,
        category: entry.category,
        termType: entry.termType,
        importance: entry.importance,
        usageFrequency: entry.usageFrequency,
      }))
    );
  }

  revalidatePath("/style-guide");
  revalidatePath("/dashboard");
}

export async function getStyleGuide(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  return db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.id, id), eq(styleGuides.userId, user.id)),
  });
}

export async function updateStyleGuide(id: string, data: Partial<StyleGuideInsert> | Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const guide = await db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.id, id), eq(styleGuides.userId, user.id)),
  });

  if (!guide) throw new Error("Unauthorized");

  const patch = sanitizeStyleGuidePatch(data as Record<string, unknown>);
  await db.update(styleGuides)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(styleGuides.id, id));

  revalidatePath(`/style-guide/${id}`);
  revalidatePath("/style-guide");
  revalidatePath("/dashboard");
}

export async function setStyleGuideSharing(id: string, isPublic: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const guide = await db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.id, id), eq(styleGuides.userId, user.id)),
  });
  if (!guide) throw new Error("Unauthorized");

  let shareToken = guide.shareToken;
  if (isPublic && !shareToken) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateShareToken();
      try {
        const [updated] = await db.update(styleGuides)
          .set({ isPublic: true, shareToken: candidate, updatedAt: new Date() })
          .where(eq(styleGuides.id, id))
          .returning({ shareToken: styleGuides.shareToken, isPublic: styleGuides.isPublic });
        revalidatePath(`/style-guide/${id}`);
        revalidatePath("/style-guide");
        return updated;
      } catch {
        // Unique token collision — retry with a new token.
      }
    }
    throw new Error("Could not create a share link. Please try again.");
  }

  const [updated] = await db.update(styleGuides)
    .set({ isPublic, shareToken, updatedAt: new Date() })
    .where(eq(styleGuides.id, id))
    .returning({ shareToken: styleGuides.shareToken, isPublic: styleGuides.isPublic });

  revalidatePath(`/style-guide/${id}`);
  revalidatePath("/style-guide");
  return updated;
}

export async function getDictionaryEntries(styleGuideId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const guide = await db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.id, styleGuideId), eq(styleGuides.userId, user.id)),
  });
  if (!guide) throw new Error("Unauthorized");

  return await db.query.dictionaryEntries.findMany({
    where: eq(dictionaryEntries.styleGuideId, styleGuideId),
    orderBy: [desc(dictionaryEntries.createdAt)],
  });
}

export async function addDictionaryEntry(styleGuideId: string, entry: typeof dictionaryEntries.$inferInsert) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const guide = await db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.id, styleGuideId), eq(styleGuides.userId, user.id)),
  });
  if (!guide) throw new Error("Unauthorized");

  await db.insert(dictionaryEntries).values({
    ...entry,
    styleGuideId,
  });
  revalidatePath(`/style-guide/${styleGuideId}`);
}

export async function deleteDictionaryEntry(id: string, styleGuideId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const guide = await db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.id, styleGuideId), eq(styleGuides.userId, user.id)),
  });
  if (!guide) throw new Error("Unauthorized");

  await db
    .delete(dictionaryEntries)
    .where(
      and(eq(dictionaryEntries.id, id), eq(dictionaryEntries.styleGuideId, styleGuideId))
    );
  revalidatePath(`/style-guide/${styleGuideId}`);
}

export async function updateDictionaryEntry(
  id: string,
  data: Partial<typeof dictionaryEntries.$inferInsert>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const existing = await db.query.dictionaryEntries.findFirst({
    where: eq(dictionaryEntries.id, id),
    columns: { id: true, styleGuideId: true },
  });
  if (!existing) throw new Error("Not found");

  const guide = await db.query.styleGuides.findFirst({
    where: and(
      eq(styleGuides.id, existing.styleGuideId),
      eq(styleGuides.userId, user.id)
    ),
  });
  if (!guide) throw new Error("Unauthorized");

  await db.update(dictionaryEntries)
    .set({
      ...data,
      styleGuideId: existing.styleGuideId,
      updatedAt: new Date(),
    })
    .where(eq(dictionaryEntries.id, id));

  revalidatePath(`/style-guide/${existing.styleGuideId}`);
  revalidatePath(`/style-guide`);
}
