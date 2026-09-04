"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { INSUFFICIENT_CREDITS_PATH, isInsufficientCreditsPayload } from "@/lib/credits/constants";
import { StoryCategory, StoryType } from "@/lib/data/storyTypes";
import { hookTypes, HookTypeID } from "@/lib/data/hookTypes";
import { tones, writingStyles, perspectives } from "@/lib/data/styleOptions";
import { generatePreviewHooksAction } from "./actions";
import { StoryMode } from "./mode-selection";
import { InferSelectModel } from "drizzle-orm";
import { styleGuides } from "@/lib/db/schema";

type CreateStoryAction = (
  previousState: { error?: string } | null,
  formData: FormData
) => Promise<{ error?: string } | null>;

interface CreateStoryFormProps {
  createStoryAction: CreateStoryAction;
  selectedCategory: StoryCategory;
  selectedType: StoryType;
  selectedMode: StoryMode;
  moralData?: any; // Added to support moral framework data
  archetypeData?: any; // Added to support archetype data
  styleGuides?: InferSelectModel<typeof styleGuides>[];
  onBack: () => void;
}

export default function CreateStoryForm({
  createStoryAction,
  selectedCategory,
  selectedType,
  selectedMode,
  moralData,
  archetypeData,
  styleGuides = [],
  onBack,
}: CreateStoryFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createStoryAction, { error: undefined });
  
  // Hook Generation State
  const [generationRequestId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [showHookGenerator, setShowHookGenerator] = useState(true);
  const [selectedHookTypes, setSelectedHookTypes] = useState<HookTypeID[]>([]);
  const [generatedHooks, setGeneratedHooks] = useState<Record<string, any[]>>({});
  const [selectedHook, setSelectedHook] = useState<any>(null);
  const [isGeneratingHooks, startHookGeneration] = useTransition();

  // Style Guide State
  const [selectedStyleGuideId, setSelectedStyleGuideId] = useState<string>("");

  const toggleHookType = (id: HookTypeID) => {
    if (selectedHookTypes.includes(id)) {
      setSelectedHookTypes(selectedHookTypes.filter((t) => t !== id));
    } else {
      setSelectedHookTypes([...selectedHookTypes, id]);
    }
  };

  const handleGenerateHooks = async () => {
    if (!title) {
      alert("Please enter a title first.");
      return;
    }
    if (selectedHookTypes.length === 0) {
      alert("Please select at least one hook type.");
      return;
    }

    startHookGeneration(async () => {
      // If a style guide is selected, we might want to pass that ID to the generator too?
      // For now, the generatePreviewHooksAction might not support styleGuideId yet.
      // We'll update that later.
      const result = await generatePreviewHooksAction(title, description, selectedHookTypes, language);
      if (isInsufficientCreditsPayload(result)) {
        router.push(INSUFFICIENT_CREDITS_PATH);
        return;
      }
      if (result.hooks) {
        setGeneratedHooks(result.hooks);
        router.refresh();
      } else if (result.error) {
        alert(result.error);
      }
    });
  };

  const handleSelectHook = (type: string, hook: any, index: number) => {
    const hookId = `${type}_${index}`;
    setSelectedHook({
      id: hookId,
      type,
      text: hook.text,
      whyItWorks: hook.whyItWorks,
      tone: hook.tone,
      selectedAt: new Date().toISOString(),
      isEdited: false
    });
  };

  const activeStyleGuide = styleGuides.find(sg => sg.id === selectedStyleGuideId);

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && typeof state.error === 'string' && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{state.error}</p>
        </div>
      )}

      <div className="mb-6 p-4 bg-brand-cream/70 dark:bg-brand-ink/60 rounded-xl border border-brand-seafoam/30">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-brand-ink/80 dark:text-brand-seafoam uppercase tracking-wider font-medium">Selected Type</p>
            <p className="text-sm font-semibold text-brand-ink dark:text-brand-yellow">{selectedType.name}</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-brand-ink/80 dark:text-brand-seafoam hover:text-brand-teal dark:hover:text-brand-yellow underline"
          >
            Change
          </button>
        </div>
        {moralData && moralData.primary && (
          <div className="mt-3 pt-3 border-t border-brand-seafoam/30">
             <p className="text-xs text-brand-ink/80 dark:text-brand-seafoam uppercase tracking-wider font-medium">Moral Conflict</p>
             <div className="flex items-center gap-2 mt-1">
               <span className="text-sm font-semibold text-brand-ink dark:text-brand-yellow capitalize">
                 {moralData.primary.replace('_', ' vs ')}
               </span>
               {moralData.complexity && (
                 <span className="text-xs px-2 py-0.5 rounded-full bg-brand-yellow/30 dark:bg-brand-orange/20 text-brand-orange dark:text-brand-yellow capitalize">
                   {moralData.complexity.replace('_', ' ')}
                 </span>
               )}
             </div>
          </div>
        )}
        {archetypeData && archetypeData.primary && (
          <div className="mt-3 pt-3 border-t border-brand-seafoam/30">
             <p className="text-xs text-brand-ink/80 dark:text-brand-seafoam uppercase tracking-wider font-medium">Character Archetype</p>
             <div className="flex items-center gap-2 mt-1">
               <span className="text-sm font-semibold text-brand-ink dark:text-brand-yellow capitalize">
                 {archetypeData.primary}
               </span>
               {archetypeData.secondary && (
                 <span className="text-xs text-brand-ink/80 dark:text-brand-seafoam">
                   + {archetypeData.secondary}
                 </span>
               )}
             </div>
          </div>
        )}
      </div>

      <input type="hidden" name="category" value={selectedCategory} />
      <input type="hidden" name="typeId" value={selectedType.id} />
      <input type="hidden" name="mode" value={selectedMode} />
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="styleGuideId" value={selectedStyleGuideId} />
      <input type="hidden" name="generationRequestId" value={generationRequestId} />
      {moralData && <input type="hidden" name="moralData" value={JSON.stringify(moralData)} />}
      {archetypeData && <input type="hidden" name="archetypeData" value={JSON.stringify(archetypeData)} />}
      {selectedHook && <input type="hidden" name="selectedHook" value={JSON.stringify(selectedHook)} />}

      <div className="space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-brand-ink dark:text-brand-seafoam mb-2"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full rounded-md border border-brand-seafoam/60 dark:border-brand-seafoam/40 bg-white dark:bg-brand-ink/70 px-3 py-2 text-brand-ink dark:text-brand-seafoam placeholder-brand-ink/55 dark:placeholder-brand-seafoam/50 focus:border-brand-teal dark:focus:border-brand-yellow focus:outline-none focus:ring-1 focus:ring-brand-teal dark:focus:ring-brand-yellow"
            placeholder="Enter story title"
          />
        </div>

        <div>
           <label className="block text-sm font-medium text-brand-ink dark:text-brand-seafoam mb-2">
             Language
           </label>
           <select
             value={language}
             onChange={(e) => setLanguage(e.target.value)}
             className="block w-full rounded-md border border-brand-seafoam/60 dark:border-brand-seafoam/40 bg-white dark:bg-brand-ink/70 px-3 py-2 text-brand-ink dark:text-brand-seafoam focus:border-brand-teal dark:focus:border-brand-yellow focus:outline-none focus:ring-1 focus:ring-brand-teal dark:focus:ring-brand-yellow"
           >
             <option value="en">English</option>
             <option value="de">German (Deutsch)</option>
             <option value="th">Thai (ไทย)</option>
           </select>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-brand-ink dark:text-brand-seafoam mb-2"
          >
            Description / Context
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full rounded-md border border-brand-seafoam/60 dark:border-brand-seafoam/40 bg-white dark:bg-brand-ink/70 px-3 py-2 text-brand-ink dark:text-brand-seafoam placeholder-brand-ink/55 dark:placeholder-brand-seafoam/50 focus:border-brand-teal dark:focus:border-brand-yellow focus:outline-none focus:ring-1 focus:ring-brand-teal dark:focus:ring-brand-yellow"
            placeholder="What is your story about?"
          />
        </div>

        {/* Style & Context Section */}
        <div className="bg-white dark:bg-brand-ink/80 rounded-xl border border-brand-seafoam/30 overflow-hidden">
          <div className="p-4 border-b border-brand-seafoam/30 bg-brand-cream/60 dark:bg-brand-ink/70 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h3 className="text-sm font-semibold text-brand-ink dark:text-brand-yellow">Style & Context (Optional)</h3>
            <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-brand-ink/80 dark:text-brand-seafoam whitespace-nowrap">Apply Style Guide:</label>
                <select
                    value={selectedStyleGuideId}
                    onChange={(e) => setSelectedStyleGuideId(e.target.value)}
                    className="text-sm rounded-md border border-brand-seafoam/50 dark:border-brand-seafoam/30 bg-white dark:bg-brand-ink py-1.5 px-2 max-w-[200px] text-brand-ink dark:text-brand-seafoam"
                >
                    <option value="">None (Custom)</option>
                    {styleGuides.map(sg => (
                        <option key={sg.id} value={sg.id}>{sg.name}</option>
                    ))}
                </select>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="backgroundInfo" className="block text-sm font-medium text-brand-ink dark:text-brand-seafoam mb-2">
                Background Info / World Building
              </label>
              <textarea
                id="backgroundInfo"
                name="backgroundInfo"
                rows={3}
                className="block w-full rounded-md border border-brand-seafoam/60 dark:border-brand-seafoam/40 bg-white dark:bg-brand-ink/70 px-3 py-2 text-brand-ink dark:text-brand-seafoam placeholder-brand-ink/40 dark:placeholder-brand-seafoam/50 focus:border-brand-teal dark:focus:border-brand-yellow focus:outline-none focus:ring-1 focus:ring-brand-teal dark:focus:ring-brand-yellow text-sm"
                placeholder="Details about the setting, time period, or important backstory..."
              />
            </div>

            {selectedStyleGuideId ? (
                <div className="p-4 bg-brand-seafoam/15 dark:bg-brand-seafoam/10 rounded-lg border border-brand-seafoam/30 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-brand-ink dark:text-brand-yellow">Using: {activeStyleGuide?.name}</span>
                        </div>
                        <Link href={`/style-guide/${selectedStyleGuideId}`} target="_blank" className="text-xs text-brand-teal dark:text-brand-yellow hover:underline">
                            View/Edit Guide
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-brand-ink/85 dark:text-brand-seafoam">
                        <div>
                            <span className="text-brand-ink/80 dark:text-brand-seafoam">Tone:</span> <span className="capitalize">{activeStyleGuide?.toneId || "Neutral"}</span>
                        </div>
                        <div>
                            <span className="text-brand-ink/80 dark:text-brand-seafoam">Style:</span> <span className="capitalize">{activeStyleGuide?.writingStyleId || "Standard"}</span>
                        </div>
                        <div>
                             <span className="text-brand-ink/80 dark:text-brand-seafoam">Perspective:</span> <span className="capitalize">{activeStyleGuide?.perspectiveId?.replace('_', ' ') || "Third Limited"}</span>
                        </div>
                        <div>
                             <span className="text-brand-ink/80 dark:text-brand-seafoam">Complexity:</span> <span>{activeStyleGuide?.complexityLevel || "High School"}</span>
                        </div>
                    </div>
                    {activeStyleGuide?.toneDescription && (
                        <div className="text-xs text-brand-ink/80 dark:text-brand-seafoam italic mt-2 border-t border-brand-seafoam/30 pt-2">
                            "{activeStyleGuide.toneDescription}"
                        </div>
                    )}
                </div>
            ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="tone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Tone
                    </label>
                    <select
                      id="tone"
                      name="tone"
                      className="block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-zinc-500 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:focus:ring-zinc-500 text-sm"
                    >
                      <option value="">Select a tone...</option>
                      {tones.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="style" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Writing Style
                    </label>
                    <select
                      id="style"
                      name="style"
                      className="block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-zinc-500 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:focus:ring-zinc-500 text-sm"
                    >
                      <option value="">Select a style...</option>
                      {writingStyles.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="perspective" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Perspective
                    </label>
                    <select
                      id="perspective"
                      name="perspective"
                      className="block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-zinc-500 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:focus:ring-zinc-500 text-sm"
                    >
                      <option value="">Select perspective...</option>
                      {perspectives.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="customInstructions" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Custom AI Instructions
                  </label>
                  <textarea
                    id="customInstructions"
                    name="customInstructions"
                    rows={2}
                    className="block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-zinc-500 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:focus:ring-zinc-500 text-sm"
                    placeholder="Any specific rules for the AI? (e.g., 'Avoid flowery language', 'Focus on dialogue')"
                  />
                </div>
                </>
            )}
          </div>
        </div>

        {/* Hook Generator Toggle */}
        <div className="border-t border-brand-seafoam/30 pt-6">
          <button
            type="button"
            onClick={() => setShowHookGenerator(!showHookGenerator)}
            className="flex items-center gap-2 text-sm font-medium text-brand-teal dark:text-brand-yellow hover:underline"
          >
            {showHookGenerator ? "Hide Hook Generator" : "✨ Need a catchy opening hook?"}
          </button>

          {showHookGenerator && (
            <div className="mt-6 p-6 bg-brand-cream/60 dark:bg-brand-ink/60 rounded-xl border border-brand-seafoam/30">
              <h3 className="text-lg font-semibold text-brand-ink dark:text-brand-yellow mb-4">
                Generate a Great Hook
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {hookTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleHookType(type.id)}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${
                      selectedHookTypes.includes(type.id)
                        ? "border-brand-teal bg-brand-seafoam/20 dark:bg-brand-seafoam/10 ring-1 ring-brand-teal"
                        : "border-brand-seafoam/40 dark:border-brand-seafoam/30 hover:border-brand-teal dark:hover:border-brand-yellow"
                    }`}
                  >
                    <span className="mr-2">{type.icon}</span>
                    <span className="font-medium">{type.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end mb-6">
                <button
                  type="button"
                  onClick={handleGenerateHooks}
                  disabled={isGeneratingHooks || selectedHookTypes.length === 0}
                  className="px-4 py-2 bg-brand-ink dark:bg-brand-yellow text-white dark:text-brand-ink rounded-md text-sm font-medium hover:bg-brand-teal dark:hover:bg-brand-seafoam disabled:opacity-50"
                >
                  {isGeneratingHooks ? "Generating..." : "Generate Options"}
                </button>
              </div>

              {/* Generated Results */}
              {Object.keys(generatedHooks).length > 0 && (
                <div className="space-y-6">
                  {Object.entries(generatedHooks).map(([typeId, hooks]) => {
                    const typeInfo = hookTypes.find(t => t.id === typeId);
                    return (
                      <div key={typeId}>
                        <h4 className="text-sm font-medium text-brand-ink/80 dark:text-brand-seafoam uppercase tracking-wider mb-3">
                          {typeInfo?.name} Hooks
                        </h4>
                        <div className="space-y-3">
                          {Array.isArray(hooks) && hooks.map((hook: any, idx: number) => {
                            const isSelected = selectedHook?.text === hook.text;
                            return (
                              <div 
                                key={idx}
                                onClick={() => handleSelectHook(typeId, hook, idx)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-brand-teal bg-white dark:bg-brand-ink shadow-md ring-1 ring-brand-teal"
                                    : "border-brand-seafoam/40 dark:border-brand-seafoam/30 bg-white dark:bg-brand-ink/70 hover:border-brand-teal"
                                }`}
                              >
                                <p className="text-brand-ink dark:text-brand-yellow mb-2">"{hook.text}"</p>
                                <p className="text-xs text-brand-ink/80 dark:text-brand-seafoam italic">Why: {hook.whyItWorks}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand-ink dark:bg-brand-yellow px-6 py-2.5 text-sm font-medium text-white dark:text-brand-ink hover:bg-brand-teal dark:hover:bg-brand-seafoam focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isPending ? "Creating Story..." : "Create Story"}
        </button>
        <Link
          href="/"
          className="rounded-md border border-brand-seafoam/50 px-6 py-2.5 text-sm font-medium text-brand-ink dark:text-brand-seafoam hover:bg-brand-cream dark:hover:bg-brand-seafoam/15"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
