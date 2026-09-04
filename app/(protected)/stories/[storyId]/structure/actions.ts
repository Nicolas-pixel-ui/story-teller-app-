"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  recommendStructure,
  generateBeatDraft,
  generateStructureOutline,
} from "@/lib/ai/story-generator";
import { structureDefinitions } from "@/lib/data/structures";
import { CREDIT_DEBIT_FAILED_MESSAGE } from "@/lib/credits/constants";
import { creditGate, type InsufficientCreditsResponse } from "@/lib/credits/redirect";
import { consumeCredit } from "@/lib/credits/service";
import { userFriendlyAiError } from "@/lib/ai/gemini-generate";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

export async function saveStructure(storyId: string, structureData: any) {
  const userId = await requireUserId();

  try {
    await db
      .update(stories)
      .set({
        structure: structureData,
        updatedAt: new Date(),
      })
      .where(and(eq(stories.id, storyId), eq(stories.userId, userId)));

    revalidatePath(`/stories/${storyId}/structure`);
    return { success: true };
  } catch (error) {
    console.error("Error saving structure:", error);
    return { error: "Failed to save structure" };
  }
}

export async function getAIStructureRecommendationAction(
  storyContext: any
): Promise<
  Awaited<ReturnType<typeof recommendStructure>> | InsufficientCreditsResponse
> {
  const userId = await requireUserId();
  const blocked = creditGate(
    await consumeCredit({
      userId,
      reason: "structure_recommend",
      metadata: { storyId: storyContext?.id ?? null },
    })
  );
  if (blocked) return blocked;

  const availableStructures = Object.values(structureDefinitions);
  return await recommendStructure(storyContext, availableStructures);
}

export async function getBeatDraftAction(
  beat: any,
  storyContext: any,
  previousBeats: any[],
  requestId?: string
): Promise<string | InsufficientCreditsResponse | { error: string }> {
  try {
    const userId = await requireUserId();
    try {
      const blocked = creditGate(
        await consumeCredit({
          userId,
          reason: "structure_beat_draft",
          requestId,
          metadata: { beatId: beat?.id ?? null, storyId: storyContext?.id ?? null },
        })
      );
      if (blocked) return blocked;
    } catch (error) {
      console.error("[beat_draft] Credit debit failed:", error);
      return { error: CREDIT_DEBIT_FAILED_MESSAGE };
    }

    return await generateBeatDraft(beat, storyContext, previousBeats);
  } catch (error) {
    console.error("[beat_draft] Failed:", error);
    return {
      error: userFriendlyAiError(error instanceof Error ? error.message : String(error)),
    };
  }
}

export async function getStructureOutlineAction(
  structureId: string,
  storyContext: any
): Promise<Awaited<ReturnType<typeof generateStructureOutline>> | InsufficientCreditsResponse> {
  const userId = await requireUserId();
  const blocked = creditGate(
    await consumeCredit({
      userId,
      reason: "structure_outline",
      metadata: { structureId, storyId: storyContext?.id ?? null },
    })
  );
  if (blocked) return blocked;

  const structure = structureDefinitions[structureId];
  if (!structure) throw new Error("Structure not found");
  return await generateStructureOutline(structure, storyContext);
}
