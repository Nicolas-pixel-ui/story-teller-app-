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

const ARCHETYPE_MODEL_CANDIDATES = [
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-2.5-flash",
] as const;

function isRecoverableGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("503") ||
    lower.includes("429") ||
    lower.includes("high demand") ||
    lower.includes("not found") ||
    lower.includes("unsupported") ||
    lower.includes("model")
  );
}

async function generateArchetypeSuggestion(prompt: string): Promise<ArchetypeSuggestion> {
  let lastError: unknown = null;

  for (const modelName of ARCHETYPE_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const suggestion = JSON.parse(text) as ArchetypeSuggestion;

      if (!archetypesLibrary[suggestion.primaryRecommendation]) {
        suggestion.primaryRecommendation = "warrior";
      }

      return suggestion;
    } catch (error) {
      lastError = error;
      if (!isRecoverableGeminiError(error)) {
        throw error;
      }
      console.warn(`[archetype_suggest] Model ${modelName} failed, trying fallback:`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No available Gemini model could generate an archetype suggestion.");
}

export async function getAIArchetypeSuggestion(
  context: StoryContext,
  requestId?: string
): Promise<ArchetypeSuggestion | InsufficientCreditsResponse> {
  const fallbackSuggestion = (): ArchetypeSuggestion => ({
    primaryRecommendation: "warrior",
    confidence: "low",
    reasoning:
      "AI service is temporarily unavailable. Based on general storytelling principles, the Warrior archetype is a strong starting point for many protagonists.",
    alternativeOptions: [
      { archetypeId: "explorer", reason: "Good for journey-based stories" },
      { archetypeId: "artist", reason: "Good for creative protagonists" },
    ],
  });

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fallbackSuggestion();
    }

    try {
      const creditResult = await consumeCredit({
        userId: user.id,
        reason: "archetype_suggest",
        requestId,
        metadata: { storyType: context.storyType ?? null },
      });
      const blocked = creditGate(creditResult);
      if (blocked) return blocked;
    } catch (error) {
      console.warn("[archetype_suggest] Credit debit failed, continuing without charge:", error);
    }

    if (!apiKey) {
      console.warn("GEMINI_API_KEY not set for archetype suggestion");
      return {
        primaryRecommendation: "warrior",
        confidence: "low",
        reasoning:
          "AI service unavailable (No API Key). Suggesting Warrior archetype as default.",
        alternativeOptions: [],
      };
    }

    try {
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
        "primaryRecommendation": "archetype_id", // Must match one of the IDs provided (lowercase)
        "confidence": "high" | "medium" | "low",
        "reasoning": "Concise explanation of why this fits (max 2 sentences).",
        "alternativeOptions": [
          { "archetypeId": "archetype_id", "reason": "Brief reason" },
          { "archetypeId": "archetype_id", "reason": "Brief reason" }
        ]
      }
    `;

      return await generateArchetypeSuggestion(prompt);
    } catch (error) {
      console.error("Error getting archetype suggestion:", error);
      return fallbackSuggestion();
    }
  } catch (error) {
    console.error("Unexpected error in getAIArchetypeSuggestion:", error);
    return fallbackSuggestion();
  }
}
