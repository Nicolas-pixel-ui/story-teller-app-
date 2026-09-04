import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_DEBIT_FAILED_MESSAGE } from "@/lib/credits/constants";
import { creditGate } from "@/lib/credits/redirect";
import { consumeCredit } from "@/lib/credits/service";
import {
  generateArchetypeSuggestion,
  localArchetypeSuggestion,
  type StoryContext,
} from "@/lib/ai/archetype-suggest";

export const maxDuration = 30;

function isStoryContext(value: unknown): value is StoryContext {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.title === "string" && typeof record.description === "string";
}

export async function POST(request: Request) {
  let context: StoryContext = { title: "New Story", description: "" };

  try {
    const body = (await request.json()) as { context?: unknown; requestId?: unknown };
    if (isStoryContext(body.context)) {
      context = {
        title: body.context.title,
        description: body.context.description,
        storyType: typeof body.context.storyType === "string" ? body.context.storyType : undefined,
      };
    }

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const requestId = typeof body.requestId === "string" ? body.requestId : undefined;
      const creditResult = await consumeCredit({
        userId: user.id,
        reason: "archetype_suggest",
        requestId,
        metadata: { storyType: context.storyType ?? null },
      });
      const blocked = creditGate(creditResult);
      if (blocked) {
        return NextResponse.json(blocked, { status: 402 });
      }
    } catch (error) {
      console.error("[archetype_suggest] Auth/credit lookup failed:", error);
      return NextResponse.json(
        { error: CREDIT_DEBIT_FAILED_MESSAGE },
        { status: 503 }
      );
    }

    const suggestion = await generateArchetypeSuggestion(context);
    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("[archetype_suggest] unhandled error:", error);
    return NextResponse.json({
      suggestion: localArchetypeSuggestion(context),
    });
  }
}
