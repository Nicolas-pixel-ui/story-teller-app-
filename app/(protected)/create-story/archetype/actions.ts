"use server";

import { createClient } from "@/lib/supabase/server";
import { creditGate, type InsufficientCreditsResponse } from "@/lib/credits/redirect";
import { consumeCredit } from "@/lib/credits/service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { archetypesLibrary } from "@/lib/data/archetypes";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

interface StoryContext {
  title: string;
  description: string;
  storyType?: string;
}

interface ArchetypeSuggestion {
  primaryRecommendation: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  alternativeOptions: { archetypeId: string; reason: string }[];
}

/**
 * Prefer models that currently succeed for this API key.
 * Avoid leading with GEMINI_SCENE_MODEL (often gemini-1.5-pro) — those 404 and burn
 * serverless time before a working model is tried.
 */
const ARCHETYPE_MODEL_CANDIDATES = [
  process.env.GEMINI_ARCHETYPE_MODEL,
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
].filter((name, index, all): name is string => Boolean(name) && all.indexOf(name) === index);

function isRecoverableGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("503") ||
    lower.includes("429") ||
    lower.includes("404") ||
    lower.includes("high demand") ||
    lower.includes("not found") ||
    lower.includes("unsupported") ||
    lower.includes("unavailable") ||
    lower.includes("overloaded") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("model") ||
    lower.includes("json") ||
    lower.includes("unexpected")
  );
}

function resolveArchetypeId(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim().toLowerCase();
  if (archetypesLibrary[raw]) return raw;
  const slug = raw.replace(/^the\s+/, "").replace(/\s+/g, "-");
  if (archetypesLibrary[slug]) return slug;
  const match = Object.values(archetypesLibrary).find(
    (archetype) =>
      archetype.id === raw ||
      archetype.name.toLowerCase() === raw ||
      archetype.name.toLowerCase() === `the ${raw}`
  );
  return match?.id ?? null;
}

function localArchetypeSuggestion(context: StoryContext): ArchetypeSuggestion {
  const hay = `${context.storyType ?? ""} ${context.title} ${context.description}`.toLowerCase();
  let primary = "artist";
  if (/pitch|business|vision|presentation|case study/.test(hay)) primary = "ruler";
  else if (/brand|marketing|campaign|launch|product/.test(hay)) primary = "magician";
  else if (/customer|success|care|wedding|tribute|biography/.test(hay)) primary = "caregiver";
  else if (/tutorial|lesson|how-to|academic|explanation/.test(hay)) primary = "sage";
  else if (/speech|keynote|personal narrative/.test(hay)) primary = "warrior";
  else if (/rebel|underdog/.test(hay)) primary = "rebel";
  else if (/travel|journey|explorer/.test(hay)) primary = "explorer";

  const name = archetypesLibrary[primary]?.name ?? primary;
  return {
    primaryRecommendation: primary,
    confidence: "medium",
    reasoning: `Based on a ${context.storyType || "story"} like this, ${name} is a strong protagonist fit you can refine as the plot takes shape.`,
    alternativeOptions: [
      { archetypeId: "explorer", reason: "Works well when the story is a journey of discovery." },
      { archetypeId: "warrior", reason: "A clear goal and obstacles often suit this archetype." },
    ].filter((option) => option.archetypeId !== primary),
  };
}

function normalizeSuggestion(
  raw: unknown,
  context: StoryContext
): ArchetypeSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const primary =
    resolveArchetypeId(record.primaryRecommendation) ??
    resolveArchetypeId(record.archetypeId) ??
    resolveArchetypeId(record.id);
  if (!primary) return null;

  const confidence =
    record.confidence === "high" || record.confidence === "medium" || record.confidence === "low"
      ? record.confidence
      : "medium";
  const reasoning =
    typeof record.reasoning === "string" && record.reasoning.trim()
      ? record.reasoning.trim()
      : localArchetypeSuggestion(context).reasoning;

  const alternatives = Array.isArray(record.alternativeOptions)
    ? record.alternativeOptions
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const option = item as Record<string, unknown>;
          const archetypeId = resolveArchetypeId(option.archetypeId ?? option.id);
          if (!archetypeId || archetypeId === primary) return null;
          const reason =
            typeof option.reason === "string" && option.reason.trim()
              ? option.reason.trim()
              : "Another strong fit for this story.";
          return { archetypeId, reason };
        })
        .filter((item): item is { archetypeId: string; reason: string } => item !== null)
        .slice(0, 3)
    : [];

  return {
    primaryRecommendation: primary,
    confidence,
    reasoning,
    alternativeOptions: alternatives,
  };
}

function parseSuggestionText(text: string, context: StoryContext): ArchetypeSuggestion | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return normalizeSuggestion(JSON.parse(trimmed.slice(start, end + 1)), context);
  } catch {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

async function generateArchetypeSuggestion(
  prompt: string,
  context: StoryContext
): Promise<ArchetypeSuggestion> {
  for (const modelName of ARCHETYPE_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await withTimeout(
        model.generateContent(prompt),
        12000,
        `Model ${modelName}`
      );
      const parsed = parseSuggestionText(result.response.text(), context);
      if (parsed) {
        console.info(`[archetype_suggest] Used model ${modelName}`);
        return parsed;
      }
      console.warn(`[archetype_suggest] Model ${modelName} returned an unusable suggestion payload`);
    } catch (error) {
      console.warn(`[archetype_suggest] Model ${modelName} failed, trying fallback:`, error);
      if (!isRecoverableGeminiError(error)) {
        // Still try other models; never abort the whole suggestion flow.
        continue;
      }
    }
  }

  return localArchetypeSuggestion(context);
}

async function debitArchetypeCredit(userId: string, requestId: string | undefined, storyType?: string) {
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

    if (!apiKey) {
      console.warn("GEMINI_API_KEY not set for archetype suggestion");
      return localArchetypeSuggestion(context);
    }

    const archetypesList = Object.values(archetypesLibrary)
      .map((a) => `${a.id} (${a.name}): ${a.tagline}`)
      .join("\n");

    const prompt = `
      You are an expert story analyst. Based on the following story concept, recommend the most suitable Character Archetype for the protagonist.
      
      Story Title: ${context.title}
      Story Description: ${context.description}
      Story Type: ${context.storyType || "Not specified"}
      
      Available Archetypes:
      ${archetypesList}
      
      Analyze the themes, tone, and goals of the story.
      Return a JSON object with this structure:
      {
        "primaryRecommendation": "archetype_id",
        "confidence": "high" | "medium" | "low",
        "reasoning": "Concise explanation of why this fits (max 2 sentences).",
        "alternativeOptions": [
          { "archetypeId": "archetype_id", "reason": "Brief reason" },
          { "archetypeId": "archetype_id", "reason": "Brief reason" }
        ]
      }

      primaryRecommendation MUST be one of the archetype ids listed above (lowercase).
    `;

    return await generateArchetypeSuggestion(prompt, context);
  } catch (error) {
    console.error("Error getting archetype suggestion:", error);
    return localArchetypeSuggestion(context);
  }
}
