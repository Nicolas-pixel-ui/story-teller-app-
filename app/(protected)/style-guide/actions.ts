"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { styleGuides, dictionaryEntries } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getStyleGuides() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return getStyleGuidesForUser(user.id);
}

export async function getStyleGuidesForUser(userId: string) {
  const guides = await db
    .select()
    .from(styleGuides)
    .where(eq(styleGuides.userId, userId))
    .orderBy(desc(styleGuides.updatedAt));

  return guides;
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
    toneId: "neutral",
    writingStyleId: "standard",
    perspectiveId: "third_limited",
    // Defaults
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

  // Verify ownership
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

  const { id: _, createdAt, updatedAt, name, ...rest } = guide;

  const newGuide = await db.insert(styleGuides).values({
    ...rest,
    name: await uniqueStyleGuideName(user.id, `${name} (Copy)`),
  }).returning();

  // Copy dictionary entries if we had them (not yet implemented in create, but good for future)
  const entries = await db.query.dictionaryEntries.findMany({
    where: eq(dictionaryEntries.styleGuideId, id),
  });

  if (entries.length > 0) {
    await db.insert(dictionaryEntries).values(
      entries.map(e => ({
        styleGuideId: newGuide[0].id,
        term: e.term,
        definition: e.definition,
        usageGuidelines: e.usageGuidelines,
        category: e.category,
      }))
    );
  }

  revalidatePath("/style-guide");
  revalidatePath("/dashboard");
}

export async function getStyleGuide(id: string) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/712fc693-8823-4212-b37e-89ae6bcbbd97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:getStyleGuide',message:'getStyleGuide entry',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const supabase = await createClient();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/712fc693-8823-4212-b37e-89ae6bcbbd97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:getStyleGuide',message:'Before getUser call',data:{hasSupabase:!!supabase},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const { data: { user }, error } = await supabase.auth.getUser();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/712fc693-8823-4212-b37e-89ae6bcbbd97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:getStyleGuide',message:'After getUser call',data:{hasUser:!!user,hasError:!!error,errorCode:error?.code,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (!user) throw new Error("Unauthorized");

  const guide = await db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.id, id), eq(styleGuides.userId, user.id)),
  });

  return guide;
}

export async function updateStyleGuide(id: string, data: Partial<typeof styleGuides.$inferInsert>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Verify ownership
  const guide = await db.query.styleGuides.findFirst({
    where: and(eq(styleGuides.id, id), eq(styleGuides.userId, user.id)),
  });

  if (!guide) throw new Error("Unauthorized");

  await db.update(styleGuides)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(styleGuides.id, id));

  revalidatePath(`/style-guide/${id}`);
  revalidatePath("/style-guide");
  revalidatePath("/dashboard");
}

export async function getDictionaryEntries(styleGuideId: string) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/712fc693-8823-4212-b37e-89ae6bcbbd97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:getDictionaryEntries',message:'getDictionaryEntries entry',data:{styleGuideId},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const supabase = await createClient();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/712fc693-8823-4212-b37e-89ae6bcbbd97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:getDictionaryEntries',message:'Before getUser call',data:{hasSupabase:!!supabase},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const { data: { user }, error } = await supabase.auth.getUser();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/712fc693-8823-4212-b37e-89ae6bcbbd97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:getDictionaryEntries',message:'After getUser call',data:{hasUser:!!user,hasError:!!error,errorCode:error?.code,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  
    if (!user) throw new Error("Unauthorized");
    
    // Check access to style guide
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

     // Check access
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

    // We rely on checking styleGuide access via linkage, but simpler to just delete by ID if we assume ID is UUID
    // But better to be safe.
    await db.delete(dictionaryEntries).where(eq(dictionaryEntries.id, id));
    revalidatePath(`/style-guide/${styleGuideId}`);
}

export async function updateDictionaryEntry(
  id: string,
  data: Partial<typeof dictionaryEntries.$inferInsert>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Unauthorized");
  
  await db.update(dictionaryEntries)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(dictionaryEntries.id, id));
    
  revalidatePath(`/style-guide`);
}
