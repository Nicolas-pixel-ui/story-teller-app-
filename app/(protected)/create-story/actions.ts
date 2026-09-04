"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { stories, users } from "@/lib/db/schema";
import { generateStory, generateHooks } from "@/lib/ai/story-generator";
import { storyCategories, StoryCategory, StoryType } from "@/lib/data/storyTypes";
import { eq, and } from "drizzle-orm";
import { styleGuides } from "@/lib/db/schema";
import { creditGate, redirectIfInsufficientCredits } from "@/lib/credits/redirect";
import { consumeCredit } from "@/lib/credits/service";
import { isNextRedirectError } from "@/lib/navigation/redirect-error";
import { withTimeout } from "@/lib/ai/action-result";

export async function generatePreviewHooksAction(
  title: string,
  description: string,
  selectedTypes: string[],
  language: string
) {
  const supabase = await createClient();
  const {
    data: { user },
    // ...
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const creditResult = await consumeCredit({
      userId: user.id,
      reason: "hook_preview",
      metadata: { title: title.trim() },
    });
    const blocked = creditGate(creditResult);
    if (blocked) return blocked;

    const generatedData = await generateHooks(title, description, selectedTypes, language);
    return { hooks: generatedData.hooks };
  } catch (error) {
    console.error("Error generating preview hooks:", error);
    return { 
        error: process.env.NODE_ENV === "development" 
          ? `Dev Error: ${error instanceof Error ? error.message : String(error)}`
          : "Failed to generate hooks" 
    };
  }
}

export async function createStoryAction(
  previousState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const typeId = formData.get("typeId") as string;
  const language = formData.get("language") as string || "en";
  const selectedHookData = formData.get("selectedHook") as string;
  const mode = formData.get("mode") as "quick" | "comprehensive";
  const moralDataString = formData.get("moralData") as string;
  const archetypeDataString = formData.get("archetypeData") as string;
  const structureDataString = formData.get("structureData") as string;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return { error: "Title is required" };
  }

  let storyTypeObject: { category: string; type?: StoryType } | null = null;
  if (category && category !== "custom") {
    const categoryData = storyCategories[category as StoryCategory];
    if (categoryData) {
      const typeData = categoryData.types.find((t) => t.id === typeId);
      if (typeData) {
        storyTypeObject = { category, type: typeData };
      }
    }
  } else if (category === "custom") {
    storyTypeObject = { category: "custom" };
  }

  let moralData = null;
  if (moralDataString) {
    try {
      moralData = JSON.parse(moralDataString);
    } catch (e) {
      console.warn("Failed to parse moral data", e);
    }
  }

  let archetypeData = null;
  if (archetypeDataString) {
    try {
      archetypeData = JSON.parse(archetypeDataString);
    } catch (e) {
      console.warn("Failed to parse archetype data", e);
    }
  }

  let structureData = null;
  if (structureDataString) {
    try {
      structureData = JSON.parse(structureDataString);
    } catch (e) {
      console.warn("Failed to parse structure data", e);
    }
  }

  try {
    // 1. Prepare Style Preferences
    const styleGuideId = formData.get("styleGuideId") as string;
    let stylePreferences: any = {
      tone: formData.get("tone") as string,
      style: formData.get("style") as string,
      perspective: formData.get("perspective") as string,
      backgroundInfo: formData.get("backgroundInfo") as string,
      customInstructions: formData.get("customInstructions") as string,
    };

    if (styleGuideId) {
       const guide = await db.query.styleGuides.findFirst({
         where: and(eq(styleGuides.id, styleGuideId), eq(styleGuides.userId, user.id))
       });

       if (guide) {
         stylePreferences = {
           ...stylePreferences,
           tone: guide.toneId,
           style: guide.writingStyleId,
           perspective: guide.perspectiveId,
           complexityLevel: guide.complexityLevel,
           primaryColor: guide.primaryColor,
           secondaryColor: guide.secondaryColor,
           fontHeading: guide.fontHeading,
           fontBody: guide.fontBody,
           toneDescription: guide.toneDescription,
         };
       }
    }

    // 2. Build Prompt Context
    let promptContext = description || "";
    
    if (storyTypeObject && storyTypeObject.category !== "custom" && storyTypeObject.type) {
      promptContext += `\n\nStory Type: ${storyTypeObject.type.name}`;
      promptContext += `\nContext: ${storyTypeObject.type.description}`;
      promptContext += `\nKey Elements to Include: ${storyTypeObject.type.keyElements.join(", ")}`;
    }

    if (archetypeData && archetypeData.primary) {
      promptContext += `\n\nPrimary Archetype: ${archetypeData.primary}`;
      if (archetypeData.secondary) promptContext += `\nSecondary Archetype: ${archetypeData.secondary}`;
      
      if (archetypeData.darkSides) {
        const sides = [];
        if (archetypeData.darkSides.tooMuch) sides.push("Excessive trait (Too Much)");
        if (archetypeData.darkSides.tooLittle) sides.push("Deficient trait (Too Little)");
        if (sides.length > 0) promptContext += `\nCharacter Shadow/Dark Sides: ${sides.join(", ")}`;
      }
      
      if (archetypeData.journey) {
         promptContext += `\n\nCharacter Arc:`;
         if (archetypeData.journey.start) promptContext += `\n- Beginning: ${archetypeData.journey.start}`;
         if (archetypeData.journey.middle) promptContext += `\n- Middle/Challenge: ${archetypeData.journey.middle}`;
         if (archetypeData.journey.end) promptContext += `\n- Ending/Resolution: ${archetypeData.journey.end}`;
      }
    }

    if (moralData && moralData.primary) {
      promptContext += `\n\nMoral Conflict: ${moralData.primary.replace('_', ' vs ')}`;
      if (moralData.complexity) promptContext += ` (${moralData.complexity})`;
    }

    // Inject Style Preferences
    if (stylePreferences.tone) promptContext += `\n\nTone: ${stylePreferences.tone}`;
    if (stylePreferences.style) promptContext += `\nWriting Style: ${stylePreferences.style}`;
    if (stylePreferences.perspective) promptContext += `\nPerspective: ${stylePreferences.perspective}`;
    if (stylePreferences.toneDescription) promptContext += `\nTone Description: ${stylePreferences.toneDescription}`;
    if (stylePreferences.complexityLevel) promptContext += `\nTarget Audience/Complexity: ${stylePreferences.complexityLevel}`;
    if (stylePreferences.customInstructions) promptContext += `\nInstructions: ${stylePreferences.customInstructions}`;
    if (stylePreferences.backgroundInfo) promptContext += `\nWorld/Background Info: ${stylePreferences.backgroundInfo}`;

    let hooksData = null;
    if (selectedHookData) {
      try {
        const parsedHook = JSON.parse(selectedHookData);
        promptContext += `\n\nIMPORTANT: Start the story with this specific opening hook: "${parsedHook.text}"`;
        
        // Structure for DB
        hooksData = {
          selectedTypes: [parsedHook.type], // Assuming single type selection for simplicity or inferred
          generated: {}, // We don't save all generated options from preview to save space/complexity unless needed
          chosen: parsedHook,
          generatedAt: new Date().toISOString()
        };
      } catch (e) {
        console.warn("Failed to parse selected hook data", e);
      }
    }

    // 3. Generate Story
    try {
      const creditResult = await withTimeout(
        consumeCredit({
          userId: user.id,
          reason: "story_generate",
          requestId: (formData.get("generationRequestId") as string | null) ?? undefined,
          metadata: { title: title.trim() },
        }),
        4000,
        "credit debit timed out"
      );
      redirectIfInsufficientCredits(creditResult);
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      console.warn("[story_generate] Credit debit failed, continuing:", error);
    }

    const generatedStory = await generateStory(title, promptContext, language);

    // 4. Save to DB
    const [newStory] = await db.insert(stories).values({
      id: crypto.randomUUID(),
      userId: user.id,
      title: title.trim(),
      description: generatedStory,
      language: language,
      stylePreferences,
      styleGuideId: styleGuideId || null,
      storyType: storyTypeObject,
      hooks: hooksData,
      mode: mode || "quick",
      moralData: moralData || {},
      moralConflictPrimary: moralData?.primary,
      moralConflictSecondary: moralData?.secondary,
      moralComplexity: moralData?.complexity,
      character: archetypeData,
      structure: structureData || {},
      // illustrations field removed temporarily due to db migration issue
    }).returning();

    // Update user preference for default mode
    if (mode) {
      try {
        // Fetch current preferences first to merge
        const currentUser = await db.query.users.findFirst({
          where: eq(users.id, user.id)
        });
        
        if (currentUser) {
          const currentPrefs = (currentUser.preferences as any) || {};
          
          await db.update(users).set({
            preferences: {
              ...currentPrefs,
              defaultMode: mode
            }
          }).where(eq(users.id, user.id));
        } else if (user.email) {
          // Create user record if missing and email is available
          await db.insert(users).values({
            id: user.id,
            email: user.email,
            preferences: { defaultMode: mode },
            updatedAt: new Date(),
            createdAt: new Date(),
          });
        }
      } catch (prefError) {
        // Non-critical error, log and continue to redirect
        console.warn("Failed to update user preferences:", prefError);
      }
    }

    redirect(`/stories/${newStory.id}`); // Redirect to the new story page
  } catch (error) {
    if (isNextRedirectError(error)) {
        throw error;
    }

    console.error("Error creating story:", error);
    // Ensure we return a string error message, never an object
    return { 
      error: process.env.NODE_ENV === "development" 
        ? `Dev Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
        : "Failed to create story. Please try again."
    };
  }
}
