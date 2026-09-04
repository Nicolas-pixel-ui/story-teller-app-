"use server";

import { createClient } from "@/lib/supabase/server";
import { creditGate, type InsufficientCreditsResponse } from "@/lib/credits/redirect";
import { consumeCredit } from "@/lib/credits/service";
import {
  generateArchetypeSuggestion,
  localArchetypeSuggestion,
  type ArchetypeSuggestion,
  type StoryContext,
} from "@/lib/ai/archetype-suggest";

async function debitArchetypeCredit(
  userId: string,
  requestId: string | undefined,
  storyType?: string
) {
  const creditResult = await consumeCredit({
    userId,
    reason: "archetype_suggest",
    requestId,
    metadata: { storyType: storyType ?? null },
  });
  return creditGate(creditResult);
}

export async function getAIArchetypeSuggestion(
  context: StoryContext,
  requestId?: string
): Promise<ArchetypeSuggestion | InsufficientCreditsResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const blocked = await debitArchetypeCredit(user.id, requestId, context.storyType);
    if (blocked) return blocked;

    return await generateArchetypeSuggestion(context);
  } catch (error) {
    console.error("Error getting archetype suggestion:", error);
    return localArchetypeSuggestion(context);
  }
}
