"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateHooks, refineHook } from "@/lib/ai/story-generator";
import { revalidatePath } from "next/cache";
import { CREDIT_DEBIT_FAILED_MESSAGE } from "@/lib/credits/constants";
import { creditGate, type InsufficientCreditsResponse } from "@/lib/credits/redirect";
import { consumeCredit } from "@/lib/credits/service";

export async function generateHooksAction(
  storyId: string,
  selectedTypes: string[]
): Promise<{ success: true } | { error: string } | InsufficientCreditsResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Fetch story to get title/description
  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, user.id)))
    .limit(1);

  if (!story) {
    throw new Error("Story not found");
  }

  try {
    const blocked = creditGate(
      await consumeCredit({
        userId: user.id,
        reason: "hook_preview",
        metadata: { storyId },
      })
    );
    if (blocked) return blocked;
  } catch (error) {
    console.error("[hook_preview] Credit debit failed:", error);
    return { error: CREDIT_DEBIT_FAILED_MESSAGE };
  }

  try {
    const generatedData = await generateHooks(
      story.title,
      story.description || "",
      selectedTypes
    );

    // Merge with existing hooks or create new structure
    const currentHooks = (story.hooks as any) || {};
    
    const newHooksData = {
      ...currentHooks,
      selectedTypes,
      generated: {
        ...(currentHooks.generated || {}),
        ...generatedData.hooks
      },
      generatedAt: new Date().toISOString()
    };

    await db
      .update(stories)
      .set({ hooks: newHooksData })
      .where(eq(stories.id, storyId));

    revalidatePath(`/stories/${storyId}`);
    return { success: true };
  } catch (error) {
    console.error("Error in generateHooksAction:", error);
    return { error: "Failed to generate hooks" };
  }
}

export async function saveSelectedHookAction(
  storyId: string,
  hookId: string,
  hookType: string,
  hookText: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Fetch current hooks
  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, user.id)))
    .limit(1);

  if (!story) {
    throw new Error("Story not found");
  }

  const currentHooks = (story.hooks as any) || {};

  const newHooksData = {
    ...currentHooks,
    chosen: {
      id: hookId,
      type: hookType,
      text: hookText,
      selectedAt: new Date().toISOString(),
      isEdited: false
    }
  };

  await db
    .update(stories)
    .set({ hooks: newHooksData })
    .where(eq(stories.id, storyId));

  revalidatePath(`/stories/${storyId}`);
  return { success: true };
}

export async function saveManualHookAction(
  storyId: string,
  hookText: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, user.id)))
    .limit(1);

  if (!story) {
    throw new Error("Story not found");
  }

  const currentHooks = (story.hooks as any) || {};

  const newHooksData = {
    ...currentHooks,
    manualHook: {
      text: hookText,
      savedAt: new Date().toISOString()
    },
    chosen: {
      id: 'manual',
      type: 'manual',
      text: hookText,
      selectedAt: new Date().toISOString(),
      isEdited: false
    }
  };

  await db
    .update(stories)
    .set({ hooks: newHooksData })
    .where(eq(stories.id, storyId));

  revalidatePath(`/stories/${storyId}`);
  return { success: true };
}

export async function refineHookAction(
  storyId: string,
  hookText: string,
  refinementType: string
): Promise<{ success: true; refinedText: string } | { error: string } | InsufficientCreditsResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, user.id)))
    .limit(1);

  if (!story) {
    throw new Error("Story not found");
  }

  try {
    const blocked = creditGate(
      await consumeCredit({
        userId: user.id,
        reason: "hook_refine",
        metadata: { storyId, refinementType },
      })
    );
    if (blocked) return blocked;
  } catch (error) {
    console.error("[hook_refine] Credit debit failed:", error);
    return { error: CREDIT_DEBIT_FAILED_MESSAGE };
  }

  try {
    const refinedText = await refineHook(
      hookText,
      refinementType,
      { title: story.title, description: story.description || "" }
    );

    return { success: true, refinedText };
  } catch (error) {
    console.error("Error in refineHookAction:", error);
    return { error: "Failed to refine hook" };
  }
}

export async function switchStoryModeAction(
  storyId: string,
  newMode: "quick" | "comprehensive"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, user.id)))
    .limit(1);

  if (!story) {
    throw new Error("Story not found");
  }

  // Track mode switch history
  const history = (story.modeSwitchHistory as any[]) || [];
  history.push({
    from: story.mode,
    to: newMode,
    at: new Date().toISOString(),
    reason: "user_action"
  });

  await db
    .update(stories)
    .set({ 
      mode: newMode,
      modeSwitchHistory: history
    })
    .where(eq(stories.id, storyId));

  revalidatePath(`/stories/${storyId}`);
  return { success: true };
}
