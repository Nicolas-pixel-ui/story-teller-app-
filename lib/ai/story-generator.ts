import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
// Use a specific model version to avoid 404s with generic alias
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.6-flash";
// Scene drafting: prefer an explicit override; default to a currently available flash model.
const SCENE_MODEL_NAME = process.env.GEMINI_SCENE_MODEL || "gemini-3.6-flash";

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI story generation will fail if called.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function generateStory(title: string, description: string, language: string = "en"): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const langMap: Record<string, string> = {
        'de': 'German',
        'th': 'Thai',
        'en': 'English'
    };
    const targetLang = langMap[language] || 'English';

    const prompt = `You are a creative story teller. Write a compelling short story based on the following:
    
    Title: ${title}
    Context/Description: ${description}

    The story should be engaging, creative, and suitable for a general audience. 
    IMPORTANT: Write the story in ${targetLang}.
    Please format the output as plain text with paragraphs.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error("Error generating story with Gemini:", error);
    // Fallback content so the app doesn't crash/fail for the user
    console.warn("Returning original description as fallback.");
    return description;
  }
}

export async function generateHooks(
  title: string,
  description: string,
  selectedTypes: string[],
  language: string = "en"
): Promise<any> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });

    const langMap: Record<string, string> = {
        'de': 'German',
        'th': 'Thai',
        'en': 'English'
    };
    const targetLang = langMap[language] || 'English';

    const prompt = `You are a creative writing expert specializing in "hooks" - opening lines that immediately capture attention.
    
    Story Title: ${title}
    Story Context: ${description}
    Language: ${targetLang}
    
    Please generate 3 distinct hook options for EACH of the following hook types: ${selectedTypes.join(", ")}.
    
    For each hook, provide:
    1. The hook text itself (in ${targetLang}).
    2. A "Why this works" explanation (in ${targetLang}, educational, short).
    3. A "Tone" (e.g., Provocative, Emotional, etc.).
    
    Return the response as a strictly valid JSON object with the following structure:
    {
      "hooks": {
        "unexpected": [ { "text": "...", "whyItWorks": "...", "tone": "..." }, ... ],
        "knowledge": [ ... ],
        ... for each requested type
      }
    }
    
    Ensure the keys in "hooks" match the requested types (lowercase).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating hooks with Gemini:", error);
    // Return fallback hooks
    return {
      hooks: {
        unexpected: [{ text: "The day the sky turned purple, I knew everything had changed.", whyItWorks: "Immediate visual intrigue.", tone: "Mystery" }],
        knowledge: [{ text: "Did you know that shadows can bite?", whyItWorks: "Challenges assumption.", tone: "Dark" }],
        action: [{ text: "I dropped the gun and started running.", whyItWorks: "In medias res.", tone: "Thriller" }]
      }
    };
  }
}

export async function refineHook(
  hookText: string,
  refinementType: string,
  storyContext: { title: string; description: string }
): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `You are a creative writing editor. Refine the following story hook.

    Original Hook: "${hookText}"
    
    Story Context:
    Title: ${storyContext.title}
    Description: ${storyContext.description}
    
    Refinement Instruction: Make it more ${refinementType} (e.g., emotional, surprising, concise, punchy).
    
    Provide ONLY the refined hook text. No explanations or quotes.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error refining hook with Gemini:", error);
    throw new Error("Failed to refine hook.");
  }
}

export async function analyzeStoryStructure(
  storyContext: { title: string; type?: string; mode?: string },
  scenes: any[],
  structureId: string
): Promise<any> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });

    const prompt = `You are a story structure expert. Analyze the following story map.

    CONTEXT:
    Title: ${storyContext.title}
    Type: ${storyContext.type || "Unknown"}
    Mode: ${storyContext.mode || "Standard"}
    Structure: ${structureId}
    
    SCENES (${scenes.length}):
    ${scenes.map((s, i) => `[${i+1}] "${s.title}" (Tension: ${s.tension}/10, Duration: ${s.duration}%)`).join("\n")}

    Provide a comprehensive analysis in valid JSON format with these sections:
    1. pacing: { score: "good" | "warning" | "issue", assessment: "...", recommendations: ["..."] }
    2. emotional_arc: { score: "...", assessment: "...", recommendations: ["..."] }
    3. structural_integrity: { score: "...", assessment: "...", recommendations: ["..."] }
    4. character_journeys: { score: "...", assessment: "...", recommendations: ["..."] }
    5. reorder_suggestions: [{ sceneIndex: number, suggestion: "...", reason: "..." }] (optional)

    Keep assessments concise and constructive. Focus on the flow of tension and structural beats.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing story structure with Gemini:", error);
    throw new Error(`Failed to analyze story: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function suggestArchetype(
  title: string,
  description: string,
  storyType: string
): Promise<any> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });

    const prompt = `You are a story consultant specializing in character development and Jungian archetypes.
    
    Story Title: ${title}
    Story Type: ${storyType}
    Story Context: ${description}
    
    Analyze the story concept and recommend the most suitable primary character archetype from the following 12 options:
    Ruler, Creator/Artist, Sage, Innocent, Explorer, Rebel, Hero/Warrior, Wizard/Magician, Jester, Everyman/Companion, Lover, Caregiver.

    Also suggest 2 alternative options.

    Return the response as a strictly valid JSON object with the following structure:
    {
      "primaryRecommendation": "archetype-id-lowercase", // e.g., "warrior"
      "confidence": "high" | "medium" | "low",
      "reasoning": "Explanation of why this archetype fits the story goals...",
      "alternativeOptions": [
        { "archetypeId": "archetype-id-lowercase", "reason": "Brief reason..." },
        { "archetypeId": "archetype-id-lowercase", "reason": "Brief reason..." }
      ]
    }

    Ensure the archetype IDs are lowercase and match standard Jungian names (e.g., "warrior", "magician", "lover", "rebel", "explorer", "creator", "ruler", "caregiver", "innocent", "jester", "sage", "orphan" or "companion"). Use "artist" for Creator and "companion" for Everyman/Orphan.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error suggesting archetype with Gemini:", error);
    throw new Error(`Failed to suggest archetype: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Fallback generator for full draft
export function generateFallbackFullDraft(storyData: any): string {
  let draft = `<h1>${storyData.title}</h1>`;
  
  if (storyData.description) {
    // Clean up if description contains previous error messages or metadata appended by creation process
    const cleanDescription = storyData.description
        .replace(/\[AI Generation Unavailable\]\s*/g, '')
        .replace(/^Title: .*?(\n\n|\n)/, '')
        .replace(/\(Note: The AI service is currently experiencing high traffic[\s\S]*\)/, '')
        .replace(/\n\n(Story Type|Primary Archetype|Moral Conflict|IMPORTANT|Context):[\s\S]*/, '')
        .trim();
        
    draft += `<p><em>${cleanDescription}</em></p><hr />`;
  }
  
  draft += `<div style="padding: 1rem; background-color: #f3f4f6; border-radius: 0.5rem; margin-bottom: 2rem;">`;
  draft += `<strong>⚠️ AI Service Unavailable - Offline Template</strong><br/>`;
  draft += `Note: The AI service is currently experiencing high traffic. This template includes your story structure so you can start writing manually.`;
  draft += `</div>`;
  
  // Hooks
  if (storyData.hooks) {
    let hookText = "";
    if (typeof storyData.hooks === 'string') {
        hookText = storyData.hooks;
    } else if (storyData.hooks.selected) {
        hookText = storyData.hooks.selected.text || storyData.hooks.selected;
    } else if (storyData.hooks.chosen) {
        hookText = storyData.hooks.chosen.text || storyData.hooks.chosen;
    } else if (Array.isArray(storyData.hooks)) {
         // Try to find the first valid hook in an array
         const firstHook = storyData.hooks[0];
         hookText = typeof firstHook === 'string' ? firstHook : (firstHook?.text || JSON.stringify(firstHook));
    } else if (typeof storyData.hooks === 'object') {
        hookText = storyData.hooks.text || "Hook content unavailable";
    }

    if (hookText && hookText !== "undefined") {
        draft += `<h2>Opening Hook</h2><p>${hookText}</p><hr />`;
    }
  }

  // Add scenes
  if (storyData.scenes && storyData.scenes.length > 0) {
    storyData.scenes.forEach((scene: any, index: number) => {
      draft += `<h2>Chapter ${index + 1}: ${scene.title || `Scene ${index + 1}`}</h2>`;
      if (scene.description) draft += `<p><em>Context: ${scene.description}</em></p>`;
      draft += `<p>[Start writing this scene here...]</p><br/><br/><hr />`;
    });
  } else if (storyData.structure && storyData.structure.beats) {
     // Fallback to beats if no scenes
    storyData.structure.beats.forEach((beat: any, index: number) => {
      draft += `<h2>Part ${index + 1}: ${beat.name || beat.title || `Beat ${index + 1}`}</h2>`;
      if (beat.description) draft += `<p><em>Focus: ${beat.description}</em></p>`;
      draft += `<p>[Start writing here...]</p><br/><br/><hr />`;
    });
  } else {
    draft += `<h2>Chapter 1</h2><p>[Start writing your story here...]</p>`;
  }
  
  return draft;
}

export async function generateFullStoryDraft(
  storyData: {
    title: string;
    description: string;
    hooks?: any;
    character?: any;
    structure?: any;
    scenes?: any[];
    moralData?: any;
  },
  options: {
    tone?: string;
    style?: string;
    language?: string;
  } = {}
): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Construct a comprehensive prompt
    let prompt = `You are a professional novelist. Write a full draft of a short story based on the following detailed outline.\n\n`;
    
    const langMap: Record<string, string> = {
        'de': 'German',
        'th': 'Thai',
        'en': 'English'
    };
    const targetLang = langMap[options.language || 'en'] || 'English';
    
    prompt += `LANGUAGE: ${targetLang}\n`;
    
    prompt += `TITLE: ${storyData.title}\n`;
    
    // Clean description if it contains error message from previous steps
    const cleanDescription = storyData.description
        ? storyData.description
            .replace(/\[AI Generation Unavailable\]\s*/g, '')
            .replace(/^Title: .*?(\n\n|\n)/, '')
            .replace(/\(Note: The AI service is currently experiencing high traffic[\s\S]*\)/, '')
            .replace(/\n\n(Story Type|Primary Archetype|Moral Conflict|IMPORTANT|Context):[\s\S]*/, '')
            .trim()
        : "";
    
    prompt += `PREMISE: ${cleanDescription}\n\n`;

    if (storyData.moralData) {
        prompt += `THEME/MORAL CONFLICT: ${JSON.stringify(storyData.moralData)}\n\n`;
    }

    if (storyData.hooks) {
      // Assuming hooks is an object with types, we just pick one or show them
      prompt += `HOOK IDEA: ${JSON.stringify(storyData.hooks)}\n\n`;
    }

    if (storyData.character) {
      prompt += `MAIN CHARACTER: ${JSON.stringify(storyData.character)}\n\n`;
    }

    if (storyData.structure) {
      prompt += `STORY STRUCTURE: ${JSON.stringify(storyData.structure)}\n\n`;
    }

    if (storyData.scenes && storyData.scenes.length > 0) {
      prompt += `SCENE OUTLINE:\n`;
      storyData.scenes.forEach((scene, index) => {
        prompt += `${index + 1}. ${scene.title}: ${scene.description || "No description"} (Mood: ${scene.emotion || "Neutral"}, Tension: ${scene.tension}/10)\n`;
      });
      prompt += `\n`;
    }

    if (options.tone) prompt += `TONE: ${options.tone}\n`;
    if (options.style) prompt += `STYLE: ${options.style}\n`;

    prompt += `\nINSTRUCTIONS:\n`;
    prompt += `1. Write the complete story from start to finish.\n`;
    prompt += `2. Incorporate the character's journey and the moral conflict naturally.\n`;
    prompt += `3. Follow the scene outline to ensure pacing matches the structure.\n`;
    prompt += `4. Use vivid imagery and "show, don't tell" techniques.\n`;
    prompt += `5. CRITICAL: Write the story in ${targetLang}.\n`;
    prompt += `6. CRITICAL: Output the story in semantic HTML format (e.g., <h1>Title</h1>, <h2>Chapter X</h2>, <p>Paragraph...</p>). Do not use Markdown.\n`;

    const result = await retryWithBackoff(async () => {
      console.log("Calling Gemini for full story draft...");
      const genResult = await model.generateContent(prompt);
      const response = await genResult.response;
      return response.text();
    });

    console.log("Draft generation successful, length:", result.length);
    // Strip markdown code blocks if AI returns them despite instructions
    return result.replace(/```html/g, '').replace(/```/g, '');
  } catch (error) {
    console.error("Error generating full draft with Gemini:", error);
    
    const message = error instanceof Error ? error.message : String(error);
    
    // Handle Rate Limits (429) gracefully
    if (message.includes("429") || message.includes("Quota exceeded")) {
      // Throw allows UI to handle retry state
      throw new Error("AI Service is busy (Rate Limit). Please try again in a moment.");
    }

    // Throw error so UI can display it without overwriting draft
    throw new Error(`Failed to generate draft: ${message}`);
  }
}

export async function improveText(text: string, type: "rewrite" | "expand" | "shorten" | "grammar"): Promise<string> {
   if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    let prompt = "";
    switch(type) {
        case "rewrite": prompt = "Rewrite the following text to improve flow and clarity:"; break;
        case "expand": prompt = "Expand the following text with more descriptive details and sensory language:"; break;
        case "shorten": prompt = "Condense the following text while preserving the core meaning and impact:"; break;
        case "grammar": prompt = "Correct any grammar, spelling, or punctuation errors in the following text:"; break;
    }

    prompt += `\n\n"${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
     console.error("Error improving text with Gemini:", error);
    throw new Error(`Failed to improve text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateSceneDraft(sceneData: any, storyContext: any): Promise<string> {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
  
    try {
      const modelCandidates = [SCENE_MODEL_NAME, MODEL_NAME];
  
      const prompt = `You are a creative writing assistant helping to develop a scene for a story.
  
  STORY CONTEXT:
  - Story Type: ${storyContext.storyType}
  - Overall Stakes: ${storyContext.overallStakes}
  - Theme: ${storyContext.theme}
  
  SCENE FRAMEWORK (Movie Time):
  
  ACTION:
  - Where: ${sceneData.movieTimeAction.where}
  - What's happening: ${sceneData.movieTimeAction.what}
  - What happens next: ${sceneData.movieTimeAction.next}
  
  EMOTION:
  - Characters involved: ${sceneData.movieTimeEmotion.characters}
  - Stakes: ${sceneData.movieTimeEmotion.stakes}
  - Tone: ${sceneData.movieTimeEmotion.tone}
  
  MEANING:
  - What changed: ${sceneData.movieTimeMeaning.change}
  - Why it matters: ${sceneData.movieTimeMeaning.significance}
  - Takeaway: ${sceneData.movieTimeMeaning.takeaway}
  
  Generate a vivid, engaging scene (300-500 words) that:
  1. Shows concrete visual action (don't just tell)
  2. Conveys emotion through physical details and dialogue
  3. Advances the story meaningfully
  4. Uses sensory details appropriate to the location
  5. Maintains the specified emotional tone
  
  Write in a style suitable for a ${storyContext.storyType}. Output ONLY the scene text in Markdown.`;
  
      let lastError: unknown = null;

      for (const modelName of modelCandidates) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const text = await retryWithBackoff(async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
          });

          if (!text?.trim()) {
            throw new Error("AI returned an empty scene draft");
          }

          return text;
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          const recoverableModelError =
            msg.includes("404") ||
            msg.toLowerCase().includes("not found") ||
            msg.toLowerCase().includes("unsupported") ||
            msg.toLowerCase().includes("model");

          if (!recoverableModelError) {
            throw err;
          }
        }
      }
      
      throw lastError instanceof Error
        ? lastError
        : new Error("No available Gemini model could generate a scene draft.");
    } catch (error) {
      console.error("Error generating scene draft with Gemini:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("429") || message.toLowerCase().includes("quota")) {
        throw new Error("AI service is busy right now (rate limit). Please try again in a moment.");
      }
      if (message.includes("GEMINI_API_KEY")) {
        throw new Error("AI is not configured on the server (missing Gemini API key).");
      }
      throw new Error(`Failed to generate scene draft: ${message}`);
    }
  }
  
  export async function analyzeShowDontTell(sceneContent: string): Promise<any> {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
  
    try {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });
  
      const prompt = `You are a writing coach analyzing a scene for "show don't tell" effectiveness.
  
  SCENE TEXT:
  ${sceneContent}
  
  Analyze this scene and provide:
  
  1. OVERALL SCORE (1-10):
  - How well does this scene SHOW rather than TELL?
  
  2. TELLING PHRASES (identify 3-5):
  For each phrase that "tells" rather than "shows":
  - Quote the original phrase
  - Suggest a "showing" alternative
  - Explain why in one sentence
  
  3. IMPROVEMENT OPPORTUNITIES:
  - Sensory details that could be added
  - Dialogue opportunities
  - Physical action suggestions
  
  4. TOP PRIORITY:
  What single change would most improve this scene?
  
  Return the response as a strictly valid JSON object with keys: "score", "tellingPhrases" (array of {original, suggestion, reason}), "improvements" (array of strings), "topPriority" (string).`;
  
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return JSON.parse(response.text());
    } catch (error) {
      console.error("Error analyzing show don't tell with Gemini:", error);
      throw new Error("Failed to analyze text.");
    }
  }
  
  export async function suggestSensoryDetails(location: string, action: string): Promise<string[]> {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
  
    try {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });
  
      const prompt = `Given this scene location and action:
  
  LOCATION: ${location}
  ACTION: ${action}
  
  Suggest 5 sensory details that would make this scene more vivid:
  - 2 visual details
  - 1 auditory detail
  - 1 tactile detail
  - 1 smell or taste detail
  
  Make suggestions brief (10-15 words each). Return as a JSON array of strings.`;
  
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return JSON.parse(response.text());
    } catch (error) {
      console.error("Error suggesting sensory details with Gemini:", error);
      return ["Crackling fire", "Smell of old books", "Cold wind against skin", "Flickering candlelight", "Distant thunder"];
    }
  }

export async function recommendStructure(
  storyContext: {
    storyType: any;
    audience: any;
    character: any;
    mode: string;
    purpose: string;
  },
  availableStructures: any[]
): Promise<any> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });

    const structuresList = availableStructures.map(s => `${s.name}: ${s.description} - Best for: ${s.bestFor?.join(', ') || ''}`).join('\n');

    const prompt = `You are an expert in narrative structures and the Storyteller Tactics framework. Your task is to recommend the most appropriate story structure based on the user's context.

    Consider:
    - Story type and typical structures that work well for it
    - Time constraints (quick vs. extended development)
    - Audience expectations
    - Character archetype and natural story arcs
    - Complexity tolerance

    Available structures:
    ${structuresList}

    Story Context:
    Story Type: ${storyContext.storyType?.name || 'Unknown'}
    Category: ${storyContext.storyType?.category || 'Unknown'}
    Audience: ${storyContext.audience || 'Unknown'}
    Character: ${storyContext.character?.name || 'Not selected'}
    Mode: ${storyContext.mode} (${storyContext.mode === 'quick' ? 'needs quick structure' : 'can handle complex structure'})
    Purpose: ${storyContext.purpose || 'Unknown'}

    Recommend the BEST structure and explain why in 2-3 sentences. Also suggest 2 alternatives.

    Return JSON:
    {
      "primary": {
        "structureId": "id (must match one of the available structure IDs)",
        "confidence": "high" | "medium" | "low",
        "reasoning": "explanation"
      },
      "alternatives": [
        {
          "structureId": "id",
          "reason": "why this could also work"
        }
      ]
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("Error recommending structure with Gemini:", error);
    // Fallback
    return {
      primary: { structureId: "man-in-a-hole", confidence: "low", reasoning: "Fallback recommendation." },
      alternatives: []
    };
  }
}

// Retry utility
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;
    
    const message = error?.message || String(error);
    // Only retry on rate limits (429) or temporary server errors (500, 503)
    const shouldRetry = message.includes("429") || message.includes("500") || message.includes("503");
    
    if (!shouldRetry) throw error;

    console.warn(`AI API failed, retrying in ${delay}ms... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

// Fallback generator
function getFallbackBeatDraft(beat: any, storyContext: any): string {
  const structure = storyContext.structure?.name || "the story";
  const character = storyContext.character?.name || "the hero";
  
  return `[AI Unavailable - Offline Template]\n\n` +
    `For this part of ${structure}, focus on ${beat.name.toLowerCase()}.\n\n` +
    `Consider how ${character} reacts to the situation. ${beat.description}\n\n` +
    `Drafting Prompt:\n` +
    (beat.guidance?.questions?.map((q: string) => `- ${q}`).join('\n') || `- What happens next to move the story forward?`);
}

export async function generateBeatDraft(
  beat: any,
  storyContext: any,
  previousBeats: any[]
): Promise<string> {
  const currentKey = process.env.GEMINI_API_KEY;
  if (!currentKey) {
    console.error("GEMINI_API_KEY is missing in server environment");
    // Return fallback immediately if no key
    return getFallbackBeatDraft(beat, storyContext);
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `You are a storytelling expert helping someone write a beat in their story.

    Structure: ${storyContext.structure?.name || 'Unknown'}
    Current Beat: ${beat.name}
    Beat Description: ${beat.description}
    Emotion: ${beat.emotion || 'Neutral'}

    Story Context:
    - Type: ${storyContext.storyType?.name || 'Unknown'}
    - Character: ${storyContext.character?.name || 'Unknown'}
    - Audience: ${storyContext.audience || 'General'}

    Previous Beats (for continuity):
    ${previousBeats.map(b => `${b.beatName}: ${b.userContent}`).join('\n')}

    Guiding Questions for this beat:
    ${beat.guidance?.questions?.join('\n') || ''}

    Write a 2-4 sentence draft for this beat that:
    1. Answers the guiding questions
    2. Maintains continuity with previous beats
    3. Uses concrete, vivid language
    4. Fits the emotional tone
    5. Is appropriate for the story type and audience

    Return only the draft text, no explanation.`;

    // Wrap the API call in retry logic
    const text = await retryWithBackoff(async () => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    });
    
    if (!text) {
        throw new Error("AI returned empty response");
    }
    
    return text.trim();
  } catch (error: any) {
    console.error("Detailed Error generating beat draft:", error);
    // Extract meaningful error message from Google's SDK if possible
    const detailedMessage = error?.message || String(error);
    
    // Check for Rate Limit specifically to use fallback
    if (detailedMessage.includes("429")) {
        console.warn("Rate limit exceeded even after retries. Using fallback.");
        return getFallbackBeatDraft(beat, storyContext);
    }
    
    if (detailedMessage.includes("API key not valid")) {
        throw new Error("Invalid API Key provided to AI service.");
    }

    // For other errors, we might also want to fallback to avoid blocking the user completely
    // but let's throw for now if it's not a rate limit issue, to help debugging other problems.
    // Or simpler: just fallback for everything in production.
    // Let's fallback for 500/503 too.
    if (detailedMessage.includes("500") || detailedMessage.includes("503") || detailedMessage.includes("fetch failed")) {
         return getFallbackBeatDraft(beat, storyContext);
    }

    throw new Error(`AI Generation Failed: ${detailedMessage}`);
  }
}

export async function generateStructureOutline(
  structure: any,
  storyContext: any
): Promise<any> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });

    const prompt = `Generate a story outline using the ${structure.name} structure.

    Story Context:
    - Type: ${storyContext.storyType?.name || 'Unknown'}
    - Character: ${storyContext.character?.name || 'Unknown'}
    - Audience: ${storyContext.audience || 'Unknown'}
    - Purpose: ${storyContext.purpose || 'Unknown'}
    - Conflict: ${storyContext.conflict?.central || 'Unknown'}

    Structure: ${structure.name}
    Key Beats: ${structure.beats.map((b: any) => b.name).join(', ')}

    Create a custom outline with ${structure.beats.length} beats. For each beat:
    1. Use the beat name from the structure
    2. Write a 1-2 sentence suggestion specific to their story
    3. Indicate approximate duration as percentage

    Return JSON array:
    [
      {
        "beatName": "Beat name",
        "suggestion": "Specific suggestion for their story",
        "duration": "20%"
      }
    ]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("Error generating structure outline with Gemini:", error);
    throw new Error("Failed to generate structure outline.");
  }
}

export async function generateIllustration(
  prompt: string,
  style: string = "cinematic"
): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    // Attempt to use a model that might support image generation or fallback to text-to-SVG
    // Note: Standard Gemini API via google-generative-ai is primarily text/multimodal-in.
    // If the user has access to Imagen via Gemini API (e.g. "nanobanana" or "imagen-3"), 
    // we would use a specific call. 
    // Since we are limited to the text SDK here, we will generate a high-quality SVG illustration
    // which acts as a vector image. This is a robust way to get visuals from a text-only LLM.
    
    // Configure model with optimized generation parameters for higher quality output
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: {
        temperature: 1.0, // Higher creativity for artistic output
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192, // Allow more detailed SVG generation
      },
    });

    // Enhanced style-specific modifiers for better quality
    const styleModifiers: Record<string, string> = {
      cinematic: "dramatic lighting, film-quality composition, depth of field, atmospheric, cinematic framing, professional color grading",
      watercolor: "soft edges, flowing colors, artistic brushstrokes, paper texture, delicate transparency, impressionistic details",
      cyberpunk: "neon lights, high contrast, futuristic elements, digital aesthetics, glowing effects, urban sci-fi atmosphere",
      minimalist: "clean lines, simple shapes, negative space, modern design, elegant composition, sophisticated color palette",
      sketch: "hand-drawn quality, pencil textures, crosshatching, artistic linework, sketch aesthetics, detailed shading",
      fantasy: "magical atmosphere, rich colors, mythical elements, enchanting details, epic scale, fantastical composition",
      "oil-painting": "canvas texture, visible brushstrokes, museum quality, rich pigments, classical painting techniques, masterful composition",
      "digital-art": "crisp details, modern illustration, vibrant colors, professional digital painting, contemporary style, polished finish",
      anime: "Japanese animation style, expressive features, dynamic poses, vibrant colors, manga-inspired, clean linework",
      realistic: "photorealistic details, accurate proportions, natural lighting, lifelike textures, high fidelity, true-to-life rendering",
      storybook: "whimsical charm, children's book quality, warm colors, inviting composition, narrative illustration, friendly aesthetic",
      "comic-book": "bold linework, dynamic composition, action-oriented, graphic novel quality, dramatic angles, pop art influence",
      impressionist: "visible brushstrokes, light and color emphasis, artistic interpretation, painterly quality, atmospheric mood",
      gothic: "dark atmosphere, dramatic shadows, mysterious mood, ornate details, haunting beauty, Victorian influence",
      "nano-banana": "playful whimsical style, smooth organic curves, warm yellow palette, banana-inspired color scheme, friendly aesthetic, fun composition, lighthearted mood, curved shapes, cheerful atmosphere, artistic cartoonish quality"
    };

    const styleEnhancement = styleModifiers[style] || styleModifiers.cinematic;

    const svgPrompt = `You are a world-class AI artist and master vector graphics designer specializing in high-quality, professional illustrations.

Create an exceptional, detailed, award-winning SVG illustration for this scene:
    
    "${prompt}"
    
STYLE: ${style}
QUALITY REQUIREMENTS: ${styleEnhancement}, high quality, masterpiece, professional illustration, sharp focus, vivid colors, detailed composition, visually stunning, artistic excellence

TECHNICAL SPECIFICATIONS:
- Output ONLY valid SVG code - no markdown, no explanations
- Use viewBox="0 0 512 512" for optimal scaling
- Employ advanced SVG techniques: complex gradients, clipping paths, filters, sophisticated shapes
- Create depth through layering and careful use of opacity
- Use rich color palettes appropriate to the style
- Minimize or exclude text; communicate through visual storytelling
- Ensure professional-grade visual quality that could be used for publication

Focus on creating a visually impressive, memorable image that captures the essence and emotion of the scene.`;

    const result = await retryWithBackoff(async () => {
      console.log("Calling Gemini for illustration...");
      const genResult = await model.generateContent(svgPrompt);
      return genResult;
    });

    const response = await result.response;
    let text = response.text().trim();
    
    // Cleanup markdown if present
    text = text.replace(/^```xml/i, "").replace(/^```svg/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    
    if (!text.startsWith("<svg")) {
      // If it failed to produce SVG, fallback or try to extract it
      const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/);
      if (svgMatch) {
        text = svgMatch[0];
      } else {
        throw new Error("Failed to generate valid SVG");
      }
    }
    
    // Convert to Base64 for storage/display consistency with potential raster images
    const base64 = Buffer.from(text).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
    
  } catch (error) {
    console.error("Error generating illustration with Gemini:", error);
    throw new Error(`Failed to generate illustration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to detect if this is cover art or scene illustration
function detectIllustrationType(title: string): 'cover' | 'scene' {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('cover') || titleLower.includes('book cover')) {
    return 'cover';
  }
  return 'scene';
}

// Helper function to extract clean title from prompt
function extractTitle(prompt: string): string {
  // Try to extract actual title from various prompt formats
  const patterns = [
    /(?:book cover (?:illustration )?for|a cover illustration for) ["']?([^"'.]+)["']?/i,
    /["']([^"']+)["']/,
    /for (.+?)(?:\.|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: use first part of prompt
  return prompt.substring(0, 30).trim();
}

export function generateFallbackIllustration(title: string, style: string): string {
  const illustrationType = detectIllustrationType(title);
  
  if (illustrationType === 'cover') {
    return generateBookCoverPhoto(title, style);
  } else {
    return generateScenePhoto(title, style);
  }
}

// Shared color palettes for visual coordination
const styleColorPalettes = {
  cinematic: { bg1: "#1a1a2e", bg2: "#16213e", accent: "#e74c3c", text: "#fff" },
  watercolor: { bg1: "#fff5e6", bg2: "#ffe0b2", accent: "#ff9a76", text: "#333" },
  cyberpunk: { bg1: "#0f0c29", bg2: "#302b63", accent: "#00f0ff", text: "#00f0ff" },
  minimalist: { bg1: "#ffffff", bg2: "#f0f0f0", accent: "#333333", text: "#333" },
  sketch: { bg1: "#fdfbf7", bg2: "#e6e6e6", accent: "#666666", text: "#666" },
  fantasy: { bg1: "#2c3e50", bg2: "#34495e", accent: "#9b59b6", text: "#fff" },
  "oil-painting": { bg1: "#8b4513", bg2: "#cd853f", accent: "#daa520", text: "#fff" },
  "digital-art": { bg1: "#667eea", bg2: "#764ba2", accent: "#f093fb", text: "#fff" },
  anime: { bg1: "#ff6b9d", bg2: "#c06c84", accent: "#ffeaa7", text: "#fff" },
  realistic: { bg1: "#3a3a3a", bg2: "#606060", accent: "#8e8e8e", text: "#fff" },
  storybook: { bg1: "#ffeaa7", bg2: "#fdcb6e", accent: "#ff6b6b", text: "#333" },
  "comic-book": { bg1: "#e74c3c", bg2: "#c0392b", accent: "#f39c12", text: "#fff" },
  impressionist: { bg1: "#74b9ff", bg2: "#a29bfe", accent: "#fd79a8", text: "#fff" },
  gothic: { bg1: "#2c2c2c", bg2: "#1a1a1a", accent: "#8e44ad", text: "#fff" },
  "nano-banana": { bg1: "#FFE135", bg2: "#FFF8DC", accent: "#FFA500", text: "#333" },
  "line-art": { bg1: "#fafafa", bg2: "#e8e8e8", accent: "#111111", text: "#111111" },
  noir: { bg1: "#0d0d0d", bg2: "#1a1a1a", accent: "#c0c0c0", text: "#e0e0e0" },
  vaporwave: { bg1: "#2b1055", bg2: "#7597de", accent: "#ff71ce", text: "#01ffff" },
  "pixel-art": { bg1: "#1d2b53", bg2: "#7e2553", accent: "#ff004d", text: "#fff1e8" },
  claymation: { bg1: "#c4a484", bg2: "#8b6914", accent: "#e8c39e", text: "#4a3728" },
  "art-nouveau": { bg1: "#1a3a2f", bg2: "#2d5a4a", accent: "#c9a227", text: "#f5e6c8" },
  steampunk: { bg1: "#3d2914", bg2: "#5c4033", accent: "#b87333", text: "#d4af37" },
  "ukiyo-e": { bg1: "#1a2744", bg2: "#c41e3a", accent: "#f5f0e1", text: "#0a1628" },
  papercraft: { bg1: "#fff8f0", bg2: "#ffe4e1", accent: "#ff6b6b", text: "#2d3436" },
  "stained-glass": { bg1: "#1e3a5f", bg2: "#0f172a", accent: "#f59e0b", text: "#38bdf8" }
};

// Generate photographic book cover
function generateBookCoverPhoto(prompt: string, style: string): string {
  const width = 512;
  const height = 512;
  const bookTitle = extractTitle(prompt);
  
  const palette = styleColorPalettes[style as keyof typeof styleColorPalettes] || styleColorPalettes.cinematic;
  const { bg1, bg2, accent, text } = palette;
  
  // Book cover with 3D effect and photographic styling
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="coverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bg1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${bg2};stop-opacity:1" />
        </linearGradient>
        <linearGradient id="spineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${bg2};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${bg1};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="4" dy="4" stdDeviation="3" flood-opacity="0.5"/>
        </filter>
      </defs>
      
      <!-- Book background with gradient -->
      <rect width="100%" height="100%" fill="url(#coverGrad)" />
      
      <!-- Book spine (3D effect) -->
      <rect x="0" y="50" width="40" height="412" fill="url(#spineGrad)" opacity="0.7"/>
      
      <!-- Main book cover area -->
      <rect x="40" y="50" width="432" height="412" fill="${bg1}" fill-opacity="0.3" filter="url(#shadow)"/>
      
      <!-- Cover photo/imagery area -->
      <rect x="70" y="80" width="372" height="220" fill="${accent}" opacity="0.2" rx="4"/>
      
      <!-- Decorative border -->
      <rect x="60" y="70" width="392" height="372" fill="none" stroke="${text}" stroke-width="2" opacity="0.3" rx="4"/>
      
      <!-- Title area background -->
      <rect x="90" y="320" width="332" height="100" fill="${bg2}" opacity="0.4" rx="4"/>
      
      <!-- Book title -->
      <text x="256" y="360" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="${text}" text-anchor="middle">
        ${bookTitle.substring(0, 20)}
      </text>
      ${bookTitle.length > 20 ? `<text x="256" y="390" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="${text}" text-anchor="middle" opacity="0.9">${bookTitle.substring(20, 40)}</text>` : ''}
      
      <!-- Author/subtitle area -->
      <text x="256" y="430" font-family="Arial, sans-serif" font-size="14" fill="${text}" text-anchor="middle" opacity="0.7" letter-spacing="2">
        ${style.toUpperCase()} STORY
      </text>
      
      <!-- Style-specific cover imagery -->
      <g opacity="0.6">${getBookCoverImagery(style, accent, text)}</g>
    </svg>
  `;
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Clean book cover imagery - simple elements per style
function getBookCoverImagery(style: string, accent: string, text: string): string {
  const imagery: Record<string, string> = {
    cinematic: `<ellipse cx="256" cy="180" rx="80" ry="50" fill="${text}" opacity="0.3"/><circle cx="256" cy="180" r="40" fill="${accent}" opacity="0.5"/>`,
    watercolor: `<ellipse cx="200" cy="150" rx="60" ry="80" fill="${accent}" opacity="0.2" transform="rotate(15 200 150)"/><ellipse cx="312" cy="200" rx="50" ry="70" fill="${text}" opacity="0.15" transform="rotate(-20 312 200)"/>`,
    cyberpunk: `<polygon points="256,120 300,150 256,180 212,150" fill="${accent}" opacity="0.6"/><rect x="220" y="200" width="72" height="72" fill="${text}" opacity="0.3" transform="rotate(45 256 236)"/>`,
    minimalist: `<circle cx="256" cy="180" r="60" fill="none" stroke="${text}" stroke-width="2" opacity="0.4"/><rect x="226" y="210" width="60" height="60" fill="${accent}" opacity="0.2"/>`,
    sketch: `<path d="M 200 150 L 250 120 L 300 160 L 270 210 L 220 200 Z" fill="none" stroke="${text}" stroke-width="2" opacity="0.4"/>`,
    fantasy: `<polygon points="256,100 266,130 298,130 272,150 282,180 256,160 230,180 240,150 214,130 246,130" fill="${accent}" opacity="0.6"/><circle cx="256" cy="220" r="35" fill="${text}" opacity="0.3"/>`,
    "oil-painting": `<rect x="180" y="140" width="80" height="100" fill="${accent}" opacity="0.4" transform="rotate(12 220 190)"/><rect x="240" y="160" width="70" height="90" fill="${text}" opacity="0.3" transform="rotate(-8 275 205)"/>`,
    "digital-art": `<polygon points="256,120 310,160 256,200 202,160" fill="${accent}" opacity="0.5"/><circle cx="256" cy="230" r="30" fill="${text}" opacity="0.4"/>`,
    anime: `<circle cx="240" cy="170" r="12" fill="${accent}" opacity="0.7"/><circle cx="272" cy="170" r="12" fill="${accent}" opacity="0.7"/><path d="M 230 190 Q 256 205 282 190" fill="none" stroke="${text}" stroke-width="3" opacity="0.6"/>`,
    realistic: `<ellipse cx="256" cy="160" rx="100" ry="60" fill="${text}" opacity="0.3"/><circle cx="256" cy="120" r="30" fill="${accent}" opacity="0.5"/>`,
    storybook: `<circle cx="230" cy="170" r="25" fill="${accent}" opacity="0.5"/><polygon points="270,170 290,210 250,210" fill="${text}" opacity="0.4"/><circle cx="300" cy="160" r="20" fill="${accent}" opacity="0.4"/>`,
    "comic-book": `<polygon points="256,130 280,150 270,180 242,180 232,150" fill="${accent}" opacity="0.6" stroke="${text}" stroke-width="2"/>`,
    impressionist: `<circle cx="220" cy="160" r="30" fill="${accent}" opacity="0.3"/><circle cx="256" cy="150" r="25" fill="${accent}" opacity="0.25"/><circle cx="292" cy="165" r="28" fill="${text}" opacity="0.2"/>`,
    gothic: `<path d="M 226 130 Q 256 100 286 130 L 286 230 L 226 230 Z" fill="${text}" opacity="0.5"/><polygon points="256,90 262,110 282,110 266,122 272,142 256,130 240,142 246,122 230,110 250,110" fill="${accent}" opacity="0.5"/>`,
    "nano-banana": `<path d="M 220 160 Q 240 130 270 150 Q 285 170 275 195 Q 260 215 235 205 Q 215 185 220 160" fill="${accent}" opacity="0.6"/><circle cx="256" cy="170" r="20" fill="${text}" opacity="0.4"/>`,
    "line-art": `<rect x="200" y="140" width="112" height="160" fill="none" stroke="${text}" stroke-width="3" opacity="0.7"/><circle cx="256" cy="200" r="40" fill="none" stroke="${accent}" stroke-width="2" opacity="0.6"/>`,
    noir: `<rect x="120" y="160" width="272" height="8" fill="${text}" opacity="0.4"/><circle cx="256" cy="200" r="50" fill="none" stroke="${accent}" stroke-width="2" opacity="0.5"/><path d="M 180 320 L 332 320" stroke="${text}" stroke-width="2" opacity="0.3"/>`,
    vaporwave: `<polygon points="256,140 320,220 256,300 192,220" fill="${accent}" opacity="0.4"/><line x1="80" y1="380" x2="432" y2="380" stroke="${text}" stroke-width="2" opacity="0.5"/>`,
    "pixel-art": `<rect x="200" y="160" width="32" height="32" fill="${accent}" opacity="0.8"/><rect x="240" y="200" width="32" height="32" fill="${text}" opacity="0.7"/><rect x="280" y="240" width="32" height="32" fill="${accent}" opacity="0.6"/>`,
    claymation: `<ellipse cx="256" cy="200" rx="70" ry="55" fill="${accent}" opacity="0.6"/><ellipse cx="220" cy="320" rx="40" ry="50" fill="${text}" opacity="0.5"/>`,
    "art-nouveau": `<path d="M 180 200 Q 256 120 332 200 Q 300 280 256 300 Q 212 280 180 200" fill="none" stroke="${accent}" stroke-width="3" opacity="0.6"/><circle cx="256" cy="220" r="30" fill="${text}" opacity="0.3"/>`,
    steampunk: `<circle cx="256" cy="200" r="50" fill="none" stroke="${accent}" stroke-width="4" opacity="0.7"/><rect x="206" y="280" width="100" height="60" fill="${text}" opacity="0.4"/>`,
    "ukiyo-e": `<ellipse cx="256" cy="200" rx="100" ry="40" fill="${accent}" opacity="0.5"/><rect x="180" y="260" width="152" height="80" fill="${text}" opacity="0.35"/>`,
    papercraft: `<polygon points="256,160 300,220 256,280 212,220" fill="${accent}" opacity="0.5"/><polygon points="200,300 256,340 312,300" fill="${text}" opacity="0.4"/>`,
    "stained-glass": `<polygon points="256,140 290,200 256,260 222,200" fill="${accent}" opacity="0.6" stroke="${text}" stroke-width="2"/><polygon points="200,260 256,320 312,260" fill="${text}" opacity="0.4" stroke="${accent}" stroke-width="2"/>`
  };
  
  return imagery[style] || imagery.cinematic;
}

// Generate photographic scene illustration
function generateScenePhoto(prompt: string, style: string): string {
  const width = 512;
  const height = 512;
  
  const palette = styleColorPalettes[style as keyof typeof styleColorPalettes] || styleColorPalettes.cinematic;
  const { bg1, bg2, accent, text } = palette;
  
  // Photographic scene with depth and lighting
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sceneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${bg1};stop-opacity:1" />
          <stop offset="70%" style="stop-color:${bg2};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${bg1};stop-opacity:0.8" />
        </linearGradient>
        <radialGradient id="light" cx="50%" cy="30%">
          <stop offset="0%" style="stop-color:${accent};stop-opacity:0.4" />
          <stop offset="100%" style="stop-color:${bg2};stop-opacity:0" />
        </radialGradient>
      </defs>
      
      <!-- Sky/background -->
      <rect width="100%" height="100%" fill="url(#sceneGrad)" />
      
      <!-- Lighting effect -->
      <ellipse cx="256" cy="150" rx="200" ry="100" fill="url(#light)"/>
      
      <!-- Ground/horizon -->
      <ellipse cx="256" cy="480" rx="250" ry="60" fill="${text}" opacity="0.15"/>
      <ellipse cx="256" cy="460" rx="220" ry="40" fill="${text}" opacity="0.1"/>
      
      <!-- Style-specific scene elements -->
      <g opacity="0.7">${getSceneElements(style, accent, text)}</g>
      
      <!-- Atmospheric depth -->
      <rect width="100%" height="100%" fill="${bg2}" opacity="0.05"/>
    </svg>
  `;
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Get style-specific photographic scene elements
function getSceneElements(style: string, accent: string, text: string): string {
  const elements: Record<string, string> = {
    cinematic: `<ellipse cx="256" cy="320" rx="60" ry="90" fill="${text}" opacity="0.6"/><circle cx="256" cy="280" r="35" fill="${text}" opacity="0.5"/><ellipse cx="150" cy="250" rx="120" ry="80" fill="${accent}" opacity="0.3"/>`,
    watercolor: `<ellipse cx="180" cy="350" rx="100" ry="70" fill="${accent}" opacity="0.2" transform="rotate(10 180 350)"/><ellipse cx="320" cy="320" rx="90" ry="80" fill="${text}" opacity="0.15" transform="rotate(-15 320 320)"/><path d="M 256 400 Q 240 340 256 290" fill="none" stroke="${text}" stroke-width="4" opacity="0.3"/>`,
    cyberpunk: `<rect x="150" y="300" width="60" height="120" fill="${accent}" opacity="0.6"/><rect x="300" y="280" width="50" height="140" fill="${accent}" opacity="0.5"/><line x1="0" y1="350" x2="512" y2="350" stroke="${accent}" stroke-width="2" opacity="0.7"/>`,
    minimalist: `<circle cx="256" cy="300" r="80" fill="none" stroke="${text}" stroke-width="2" opacity="0.4"/><rect x="206" y="360" width="100" height="60" fill="${accent}" opacity="0.2"/>`,
    sketch: `<path d="M 180 350 L 230 300 L 280 350 L 260 400 L 200 400 Z" fill="none" stroke="${text}" stroke-width="2" opacity="0.5"/><path d="M 300 330 Q 350 300 380 340" fill="none" stroke="${text}" stroke-width="2" opacity="0.4"/>`,
    fantasy: `<path d="M 180 420 L 180 300 Q 180 250 256 230 Q 332 250 332 300 L 332 420" fill="${text}" opacity="0.5"/><polygon points="256,210 266,235 295,235 272,252 282,277 256,260 230,277 240,252 217,235 246,235" fill="${accent}" opacity="0.7"/>`,
    "oil-painting": `<rect x="120" y="280" width="120" height="140" fill="${accent}" opacity="0.4" transform="rotate(5 180 350)"/><rect x="260" y="300" width="110" height="120" fill="${text}" opacity="0.35" transform="rotate(-8 315 360)"/>`,
    "digital-art": `<polygon points="256,240 320,300 256,360 192,300" fill="${accent}" opacity="0.5"/><rect x="180" y="370" width="152" height="50" fill="${text}" opacity="0.3"/>`,
    anime: `<circle cx="256" cy="280" r="45" fill="${text}" opacity="0.6"/><ellipse cx="256" cy="350" rx="50" ry="70" fill="${text}" opacity="0.6"/><ellipse cx="240" cy="275" rx="10" ry="15" fill="${accent}" opacity="0.8"/><ellipse cx="272" cy="275" rx="10" ry="15" fill="${accent}" opacity="0.8"/>`,
    realistic: `<path d="M 80 370 Q 180 320 256 340 Q 332 320 432 370 L 432 420 L 80 420 Z" fill="${text}" opacity="0.5"/><polygon points="180,300 220,240 260,300" fill="${text}" opacity="0.6"/><polygon points="260,300 300,220 340,300" fill="${text}" opacity="0.6"/>`,
    storybook: `<rect x="220" y="350" width="20" height="70" fill="${text}" opacity="0.5"/><circle cx="230" cy="330" r="45" fill="${text}" opacity="0.4"/><circle cx="210" cy="350" r="30" fill="${text}" opacity="0.35"/><circle cx="250" cy="350" r="30" fill="${text}" opacity="0.35"/>`,
    "comic-book": `<rect x="140" y="280" width="100" height="140" fill="${accent}" opacity="0.5" stroke="${text}" stroke-width="3"/><rect x="270" y="300" width="100" height="120" fill="${accent}" opacity="0.45" stroke="${text}" stroke-width="3"/><polygon points="200,280 230,240 250,280" fill="${text}" opacity="0.6"/>`,
    impressionist: `<circle cx="180" cy="320" r="40" fill="${accent}" opacity="0.3"/><circle cx="220" cy="310" r="35" fill="${accent}" opacity="0.25"/><circle cx="290" cy="330" r="45" fill="${text}" opacity="0.2"/><circle cx="330" cy="320" r="38" fill="${text}" opacity="0.18"/>`,
    gothic: `<path d="M 200 420 L 200 300 Q 200 250 256 230 Q 312 250 312 300 L 312 420" fill="${text}" opacity="0.6"/><circle cx="256" cy="250" r="25" fill="${accent}" opacity="0.5"/><path d="M 180 320 Q 200 300 220 320" fill="none" stroke="${text}" stroke-width="2" opacity="0.4"/><path d="M 292 320 Q 312 300 332 320" fill="none" stroke="${text}" stroke-width="2" opacity="0.4"/>`,
    "nano-banana": `<path d="M 180 320 Q 210 280 250 300 Q 270 320 260 360 Q 240 390 205 380 Q 175 360 180 320" fill="${accent}" opacity="0.6"/><circle cx="280" cy="340" r="35" fill="${text}" opacity="0.5"/><circle cx="320" cy="350" r="30" fill="${accent}" opacity="0.5"/><path d="M 256 340 Q 256 360 270 360" fill="none" stroke="${text}" stroke-width="3" opacity="0.6"/>`,
    "line-art": `<path d="M 160 360 L 200 280 L 256 320 L 312 280 L 352 360" fill="none" stroke="${text}" stroke-width="4" opacity="0.6"/><circle cx="256" cy="250" r="60" fill="none" stroke="${accent}" stroke-width="3" opacity="0.5"/>`,
    noir: `<rect x="100" y="300" width="312" height="4" fill="${text}" opacity="0.35"/><ellipse cx="256" cy="280" rx="80" ry="100" fill="${accent}" opacity="0.15"/><path d="M 180 380 L 332 380" stroke="${text}" stroke-width="3" opacity="0.4"/>`,
    vaporwave: `<polygon points="256,220 340,340 172,340" fill="${accent}" opacity="0.35"/><line x1="0" y1="400" x2="512" y2="400" stroke="${text}" stroke-width="2" opacity="0.4"/>`,
    "pixel-art": `<rect x="180" y="300" width="48" height="48" fill="${accent}" opacity="0.75"/><rect x="284" y="320" width="48" height="48" fill="${text}" opacity="0.65"/>`,
    claymation: `<ellipse cx="256" cy="320" rx="90" ry="70" fill="${accent}" opacity="0.55"/><circle cx="230" cy="300" r="18" fill="${text}" opacity="0.6"/><circle cx="282" cy="300" r="18" fill="${text}" opacity="0.6"/>`,
    "art-nouveau": `<path d="M 150 380 Q 256 240 362 380" fill="none" stroke="${accent}" stroke-width="4" opacity="0.5"/><ellipse cx="256" cy="300" rx="40" ry="80" fill="${text}" opacity="0.25"/>`,
    steampunk: `<circle cx="256" cy="320" r="70" fill="none" stroke="${accent}" stroke-width="5" opacity="0.55"/><rect x="196" y="360" width="120" height="40" fill="${text}" opacity="0.35"/>`,
    "ukiyo-e": `<ellipse cx="256" cy="340" rx="120" ry="50" fill="${accent}" opacity="0.4"/><rect x="196" y="280" width="120" height="60" fill="${text}" opacity="0.3"/>`,
    papercraft: `<polygon points="256,260 320,340 192,340" fill="${accent}" opacity="0.45"/><rect x="216" y="360" width="80" height="40" fill="${text}" opacity="0.35"/>`,
    "stained-glass": `<polygon points="256,240 300,300 256,360 212,300" fill="${accent}" opacity="0.5" stroke="${text}" stroke-width="3"/><polygon points="180,320 256,400 332,320" fill="${text}" opacity="0.35" stroke="${accent}" stroke-width="2"/>`
  };
  
  return elements[style] || elements.cinematic;
}

