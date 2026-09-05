import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.6-flash";

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI style analysis will fail if called.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export interface MarketingIdea {
  title: string;
  channel: string;
  headline: string;
  concept: string;
  cta: string;
}

export interface StyleAnalysisResult {
  toneId: string;
  writingStyleId: string;
  perspectiveId: string;
  complexityLevel: string;
  toneDescription: string;
  suggestedTerms: Array<{
    term: string;
    definition?: string;
    usageGuidelines?: string;
  }>;
  marketingIdeas: MarketingIdea[];
  confidence: {
    tone: number;
    style: number;
    perspective: number;
  };
}

const VALID_TONES = [
  "neutral",
  "humorous",
  "dark",
  "uplifting",
  "suspenseful",
  "romantic",
  "formal",
];

const VALID_WRITING_STYLES = [
  "standard",
  "descriptive",
  "concise",
  "poetic",
  "cinematic",
  "experimental",
];

const VALID_PERSPECTIVES = [
  "third_limited",
  "third_omniscient",
  "first_person",
];

const VALID_COMPLEXITY_LEVELS = [
  "Elementary (6th Grade)",
  "Middle School (9th Grade)",
  "High School",
  "Undergraduate",
  "PhD / Technical",
];

const MARKETING_IDEAS_HEADING = "Marketing & Advertisement Ideas:";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function clip(value: unknown, fallback: string, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, max);
}

export function sanitizeMarketingIdeas(raw: unknown): MarketingIdea[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 8)
    .map((item) => {
      const idea = asRecord(item);
      return {
        title: clip(idea.title, "Campaign idea", 120),
        channel: clip(idea.channel, "Multi-channel", 80),
        headline: clip(idea.headline, "", 200),
        concept: clip(idea.concept, "", 800),
        cta: clip(idea.cta, "Learn more", 80),
      };
    })
    .filter((idea) => idea.headline.length > 0 || idea.concept.length > 0);
}

export function formatMarketingIdeasForGuide(ideas: MarketingIdea[]): string {
  if (ideas.length === 0) return "";
  return [
    MARKETING_IDEAS_HEADING,
    ...ideas.map(
      (idea, index) =>
        `${index + 1}. ${idea.title} (${idea.channel})\n   Headline: ${idea.headline}\n   ${idea.concept}\n   CTA: ${idea.cta}`
    ),
  ].join("\n\n");
}

export function mergeToneDescriptionWithIdeas(
  toneDescription: string,
  ideas: MarketingIdea[]
): string {
  const ideasBlock = formatMarketingIdeasForGuide(ideas);
  if (!ideasBlock) return toneDescription;
  const existing = toneDescription.trim();
  if (!existing) return ideasBlock;
  if (existing.includes(MARKETING_IDEAS_HEADING)) {
    return `${existing.replace(/\n\nMarketing & Advertisement Ideas:[\s\S]*$/, "").trim()}\n\n${ideasBlock}`;
  }
  return `${existing}\n\n${ideasBlock}`;
}

function parseAnalysisJson(jsonText: string): StyleAnalysisResult {
  const cleaned = jsonText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as StyleAnalysisResult;
}

/**
 * Analyze text content and extract style characteristics using Gemini AI
 */
export async function analyzeStyleFromText(
  text: string
): Promise<StyleAnalysisResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are an expert writing style analyst and advertising strategist. Analyze the following text, extract its writing style, and create marketing and advertisement ideas grounded in that content.

TEXT SAMPLE:
${text.substring(0, 10000)}

Analyze the text and return a JSON object with the following structure:
{
  "toneId": "<one of: ${VALID_TONES.join(', ')}>",
  "writingStyleId": "<one of: ${VALID_WRITING_STYLES.join(', ')}>",
  "perspectiveId": "<one of: ${VALID_PERSPECTIVES.join(', ')}>",
  "complexityLevel": "<one of: ${VALID_COMPLEXITY_LEVELS.join(', ')}>",
  "toneDescription": "<A detailed 2-3 sentence description of the voice, tone, and writing style. Include specific observations about formality, emotion, sentence structure, vocabulary level, and any distinctive characteristics.>",
  "suggestedTerms": [
    {
      "term": "<important term or phrase>",
      "definition": "<brief definition>",
      "usageGuidelines": "<how it should be used or capitalized>"
    }
  ],
  "marketingIdeas": [
    {
      "title": "<short campaign or ad name>",
      "channel": "<one of: Instagram Ads, TikTok, LinkedIn, Google Search, Email, YouTube, Print, Billboard, Landing Page>",
      "headline": "<a specific ad headline or hook, max 12 words>",
      "concept": "<2-3 sentences describing the ad or campaign, including audience, offer, and why it fits this source>",
      "cta": "<a concrete call to action>"
    }
  ],
  "confidence": {
    "tone": <0.0-1.0>,
    "style": <0.0-1.0>,
    "perspective": <0.0-1.0>
  }
}

Guidelines:
- **toneId**: Choose the tone that best matches the emotional quality and atmosphere
- **writingStyleId**: Assess the sentence structure, descriptiveness, and narrative approach
- **perspectiveId**: Identify the narrative point of view used
- **complexityLevel**: Evaluate vocabulary sophistication, sentence complexity, and concept difficulty
- **toneDescription**: Provide actionable guidance for replicating this style
- **suggestedTerms**: Extract 5-10 distinctive terms, brand names, technical jargon, or phrases that are important to maintain consistency (e.g., product names, character names, industry terminology)
- **marketingIdeas**: Return 5 to 6 distinct ideas. Mix channels. Ground every idea in facts, products, people, benefits, or tensions from the source text. If the source is not commercial, create brand-story, awareness, or advocacy ads instead of fake product claims. Do not invent competitors, prices, or stats that are not in the text.
- **confidence**: Rate your confidence in each classification (1.0 = very confident, 0.5 = moderate, 0.3 = low)

Return ONLY the JSON object, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text();
    const analysis = parseAnalysisJson(jsonText);
    
    // Validate and sanitize the response
    if (!VALID_TONES.includes(analysis.toneId)) {
      analysis.toneId = "neutral";
    }
    if (!VALID_WRITING_STYLES.includes(analysis.writingStyleId)) {
      analysis.writingStyleId = "standard";
    }
    if (!VALID_PERSPECTIVES.includes(analysis.perspectiveId)) {
      analysis.perspectiveId = "third_limited";
    }
    if (!VALID_COMPLEXITY_LEVELS.includes(analysis.complexityLevel)) {
      analysis.complexityLevel = "High School";
    }
    
    // Ensure confidence scores are within valid range
    analysis.confidence = {
      tone: Math.min(1, Math.max(0, analysis.confidence?.tone || 0.5)),
      style: Math.min(1, Math.max(0, analysis.confidence?.style || 0.5)),
      perspective: Math.min(1, Math.max(0, analysis.confidence?.perspective || 0.5)),
    };
    
    if (analysis.suggestedTerms && analysis.suggestedTerms.length > 15) {
      analysis.suggestedTerms = analysis.suggestedTerms.slice(0, 15);
    }
    if (!Array.isArray(analysis.suggestedTerms)) {
      analysis.suggestedTerms = [];
    }

    analysis.marketingIdeas = sanitizeMarketingIdeas(analysis.marketingIdeas);

    return analysis;
  } catch (error) {
    console.error("Style analysis error:", error);
    
    // Return default values on error
    return {
      toneId: "neutral",
      writingStyleId: "standard",
      perspectiveId: "third_limited",
      complexityLevel: "High School",
      toneDescription: "Unable to analyze style. Please review and adjust manually.",
      suggestedTerms: [],
      marketingIdeas: [],
      confidence: {
        tone: 0,
        style: 0,
        perspective: 0,
      },
    };
  }
}
