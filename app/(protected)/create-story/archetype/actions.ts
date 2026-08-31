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
  try {
    const creditResult = await Promise.race([
      consumeCredit({
        userId,
        reason: "archetype_suggest",
        requestId,
        metadata: { storyType: storyType ?? null },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("credit debit timed out")), 2500);
      }),
    ]);
    return creditGate(creditResult);
  } catch (error) {
    console.warn("[archetype_suggest] Credit debit failed, continuing without charge:", error);
    return null;
  }
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

    if (user) {
      const blocked = await debitArchetypeCredit(user.id, requestId, context.storyType);
      if (blocked) return blocked;
    }

    return await generateArchetypeSuggestion(context);
  } catch (error) {
    console.error("Error getting archetype suggestion:", error);
    return localArchetypeSuggestion(context);
  }
}
