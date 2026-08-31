import { archetypesLibrary } from "@/lib/data/archetypes";
import { storyCategories } from "@/lib/data/storyTypes";

export interface StoryContext {
  title: string;
  description: string;
  storyType?: string;
}

export interface ArchetypeSuggestion {
  primaryRecommendation: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  alternativeOptions: { archetypeId: string; reason: string }[];
}

const ARCHETYPE_ALIASES: Record<string, string> = {
  hero: "warrior",
  creator: "artist",
  helper: "caregiver",
  everyman: "companion",
  orphan: "companion",
  outlaw: "rebel",
  wizard: "magician",
};

export function resolveArchetypeId(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim().toLowerCase();
  const aliased = ARCHETYPE_ALIASES[raw] ?? raw;
  if (archetypesLibrary[aliased]) return aliased;
  const slug = aliased.replace(/^the\s+/, "").replace(/\s+/g, "-");
  if (archetypesLibrary[slug]) return slug;
  const aliasedSlug = ARCHETYPE_ALIASES[slug] ?? slug;
  if (archetypesLibrary[aliasedSlug]) return aliasedSlug;
  const match = Object.values(archetypesLibrary).find(
    (archetype) =>
      archetype.id === raw ||
      archetype.id === aliased ||
      archetype.name.toLowerCase() === raw ||
      archetype.name.toLowerCase() === aliased ||
      archetype.name.toLowerCase() === `the ${raw}` ||
      archetype.name.toLowerCase() === `the ${aliased}`
  );
  return match?.id ?? null;
}

export function localArchetypeSuggestion(context: StoryContext): ArchetypeSuggestion {
  const hay = `${context.storyType ?? ""} ${context.title} ${context.description}`.toLowerCase();
  let primary = "artist";
  for (const category of Object.values(storyCategories)) {
    const type = category.types.find(
      (item) => item.name === context.storyType || item.id === context.storyType
    );
    const recommended = resolveArchetypeId(type?.recommendedArchetypes?.[0]);
    if (recommended) {
      primary = recommended;
      break;
    }
  }
  if (primary === "artist") {
    if (/pitch|business|vision|presentation|case study/.test(hay)) primary = "ruler";
    else if (/brand|marketing|campaign|launch|product/.test(hay)) primary = "magician";
    else if (/customer|success|care|wedding|tribute|biography/.test(hay)) primary = "caregiver";
    else if (/tutorial|lesson|how-to|academic|explanation/.test(hay)) primary = "sage";
    else if (/speech|keynote|personal narrative/.test(hay)) primary = "warrior";
    else if (/rebel|underdog/.test(hay)) primary = "rebel";
    else if (/travel|journey|explorer/.test(hay)) primary = "explorer";
  }

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

export function normalizeSuggestion(
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

export function parseSuggestionText(text: string, context: StoryContext): ArchetypeSuggestion | null {
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

const ARCHETYPE_MODEL_CANDIDATES = [
  process.env.GEMINI_ARCHETYPE_MODEL,
  process.env.GEMINI_MODEL,
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash",
].filter((name, index, all): name is string => Boolean(name) && all.indexOf(name) === index);

type GeminiRestResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
};

function geminiApiKey(): string {
  return (process.env.GEMINI_API_KEY || "").trim();
}

function buildPrompt(context: StoryContext): string {
  const archetypesList = Object.values(archetypesLibrary)
    .map((a) => `${a.id} (${a.name}): ${a.tagline}`)
    .join("\n");

  return `You are an expert story analyst. Based on the following story concept, recommend the most suitable Character Archetype for the protagonist.

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

primaryRecommendation MUST be one of the archetype ids listed above (lowercase). Do not wrap the JSON in markdown.`;
}

async function generateWithGeminiRest(modelName: string, prompt: string, apiKey: string): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}` +
    `:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      }),
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Model ${modelName} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json()) as GeminiRestResponse;
  if (!response.ok) {
    throw new Error(
      `Gemini ${modelName} ${response.status}: ${payload.error?.message ?? "request failed"}`
    );
  }

  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";
  if (!text) {
    throw new Error(`Gemini ${modelName} returned an empty suggestion`);
  }
  return text;
}

export async function generateArchetypeSuggestion(context: StoryContext): Promise<ArchetypeSuggestion> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    console.warn("[archetype_suggest] GEMINI_API_KEY is not set");
    return localArchetypeSuggestion(context);
  }

  const prompt = buildPrompt(context);
  for (const modelName of ARCHETYPE_MODEL_CANDIDATES) {
    try {
      const text = await generateWithGeminiRest(modelName, prompt, apiKey);
      const parsed = parseSuggestionText(text, context);
      if (parsed) {
        console.info(`[archetype_suggest] Used model ${modelName}`);
        return parsed;
      }
      console.warn(`[archetype_suggest] Model ${modelName} returned an unusable suggestion payload`);
    } catch (error) {
      console.warn(`[archetype_suggest] Model ${modelName} failed, trying fallback:`, error);
    }
  }

  return localArchetypeSuggestion(context);
}

