import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.6-flash";

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI style analysis will fail if called.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

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
        temperature: 0.3, // Lower temperature for more consistent analysis
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are an expert writing style analyst. Analyze the following text and extract its writing style characteristics.

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
- **confidence**: Rate your confidence in each classification (1.0 = very confident, 0.5 = moderate, 0.3 = low)

Return ONLY the JSON object, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text();
    
    // Parse the JSON response
    const analysis = JSON.parse(jsonText) as StyleAnalysisResult;
    
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
    
    // Limit suggested terms to 15 max
    if (analysis.suggestedTerms && analysis.suggestedTerms.length > 15) {
      analysis.suggestedTerms = analysis.suggestedTerms.slice(0, 15);
    }
    
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
      confidence: {
        tone: 0,
        style: 0,
        perspective: 0,
      },
    };
  }
}
