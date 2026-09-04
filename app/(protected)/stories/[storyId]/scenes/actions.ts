"use server";

import { db } from "@/lib/db";
import { scenes, stories } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateSceneDraft, analyzeShowDontTell, suggestSensoryDetails } from "@/lib/ai/story-generator";
import { createClient } from "@/lib/supabase/server";
import {
  consumeCredit,
} from "@/lib/credits/service";
import { creditGate, type InsufficientCreditsResponse } from "@/lib/credits/redirect";
import { withTimeout } from "@/lib/ai/action-result";
import { userFriendlyAiError } from "@/lib/ai/gemini-generate";

type CreateSceneSeed = {
  actionWhere?: string;
  actionWhat?: string;
  emotionCharacters?: string;
  emotionStakes?: string;
  emotionTone?: string;
};

export async function getScenes(storyId: string) {
  return await db
    .select()
    .from(scenes)
    .where(eq(scenes.storyId, storyId))
    .orderBy(asc(scenes.order));
}

export async function createScene(storyId: string, seed?: CreateSceneSeed) {
  const existingScenes = await db
    .select({ order: scenes.order })
    .from(scenes)
    .where(eq(scenes.storyId, storyId));

  const newOrder =
    existingScenes.length > 0 ? Math.max(...existingScenes.map((s) => s.order)) + 1 : 1;

  const [newScene] = await db
    .insert(scenes)
    .values({
      storyId,
      title: `Scene ${newOrder}`,
      order: newOrder,
      movieTimeAction: {
        where: seed?.actionWhere?.trim() || "",
        what: seed?.actionWhat?.trim() || "",
        next: "",
        sensory_details: []
      },
      movieTimeEmotion: {
        characters: seed?.emotionCharacters?.trim() || "",
        stakes: seed?.emotionStakes?.trim() || "",
        tone: seed?.emotionTone?.trim() || "neutral",
        internal_feeling: "",
        external_show: "",
        audience_feeling: ""
      },
      movieTimeMeaning: {
        change: "",
        significance: "",
        takeaway: "",
        purposes: []
      },
      completenessStatus: "empty"
    })
    .returning();

  revalidatePath(`/stories/${storyId}/scenes`);
  return newScene;
}

export async function updateScene(sceneId: string, storyId: string, data: Partial<typeof scenes.$inferInsert>) {
  const [updatedScene] = await db
    .update(scenes)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(scenes.id, sceneId))
    .returning();

  revalidatePath(`/stories/${storyId}/scenes`);
  revalidatePath(`/stories/${storyId}/scenes/${sceneId}`);
  return updatedScene;
}

export async function deleteScene(sceneId: string, storyId: string) {
  await db.delete(scenes).where(eq(scenes.id, sceneId));
  revalidatePath(`/stories/${storyId}/scenes`);
}

export async function generateSceneDraftAction(
  sceneData: any,
  storyId: string
): Promise<string | InsufficientCreditsResponse | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in and try again." };

    let storyContext = {
      storyType: "General Fiction",
      overallStakes: "The outcome of this scene",
      theme: "Transformation",
    };

    try {
      const [story] = await withTimeout(
        db
          .select()
          .from(stories)
          .where(and(eq(stories.id, storyId), eq(stories.userId, user.id)))
          .limit(1)
          .then((rows) => rows),
        3000,
        "story lookup timed out"
      );
      if (story) {
        storyContext = {
          storyType: (story.storyType as { name?: string } | null)?.name || "General Fiction",
          overallStakes: (story.hooks as { selected?: { whyItWorks?: string } } | null)?.selected?.whyItWorks || "The outcome of this scene",
          theme: "Transformation",
        };
      }
    } catch (error) {
      console.warn("[scene_generate] Story lookup failed, using defaults:", error);
    }

    try {
      const blocked = creditGate(
        await withTimeout(
          consumeCredit({
            userId: user.id,
            reason: "scene_generate",
            requestId:
              typeof sceneData?.requestId === "string" ? sceneData.requestId : undefined,
            metadata: { storyId },
          }),
          3000,
          "credit debit timed out"
        )
      );
      if (blocked) return blocked;
    } catch (error) {
      console.warn("[scene_generate] Credit debit failed, continuing:", error);
    }

    return await generateSceneDraft(sceneData, storyContext);
  } catch (error) {
    console.error("[scene_generate] Failed:", error);
    return {
      error: userFriendlyAiError(error instanceof Error ? error.message : String(error)),
    };
  }
}

export async function analyzeShowDontTellAction(content: string) {
    return await analyzeShowDontTell(content);
}

export async function suggestSensoryDetailsAction(location: string, action: string) {
    return await suggestSensoryDetails(location, action);
}
