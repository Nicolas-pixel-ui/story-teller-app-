"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  createScene,
  updateScene,
  generateSceneDraftAction,
  analyzeShowDontTellAction,
  suggestSensoryDetailsAction,
} from "../actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { INSUFFICIENT_CREDITS_PATH, isInsufficientCreditsPayload } from "@/lib/credits/constants";
import { isAiActionError } from "@/lib/ai/action-result";
import { ArrowLeft, Save, Sparkles, AlertCircle, Check, Eye, Target, MapPin, Heart, Lightbulb } from "lucide-react";

// Types derived from schema/usage
interface MovieTimeAction {
  where: string;
  what: string;
  next: string;
  sensory_details: string[];
}

interface MovieTimeEmotion {
  characters: string;
  stakes: string;
  tone: string;
  internal_feeling?: string;
  external_show?: string;
  audience_feeling?: string;
}

interface MovieTimeMeaning {
  change: string;
  significance: string;
  takeaway: string;
  purposes: string[];
}

interface Scene {
  id: string;
  storyId: string;
  title: string;
  order?: number;
  movieTimeAction: MovieTimeAction | unknown;
  movieTimeEmotion: MovieTimeEmotion | unknown;
  movieTimeMeaning: MovieTimeMeaning | unknown;
  sceneContent: string | null;
  completenessStatus: string | null;
  showTellScore: number | null;
  lastFeedback: any;
}

type SceneSummary = { id: string; title: string; order: number };

export default function SceneEditor({
  scene,
  storyId,
  allScenes,
}: {
  scene: any;
  storyId: string;
  allScenes: SceneSummary[];
}) {
  const router = useRouter();
  const [localScene, setLocalScene] = useState<Scene>(scene);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [feedback, setFeedback] = useState<any>(scene.lastFeedback);
  const [activeTab, setActiveTab] = useState<'framework' | 'draft'>('framework');
  const editorCanvasRef = useRef<HTMLDivElement | null>(null);

  // Helper to safely get nested properties
  const getAction = () => (localScene.movieTimeAction as MovieTimeAction) || { where: "", what: "", next: "", sensory_details: [] };
  const getEmotion = () => (localScene.movieTimeEmotion as MovieTimeEmotion) || { characters: "", stakes: "", tone: "neutral" };
  const getMeaning = () => (localScene.movieTimeMeaning as MovieTimeMeaning) || { change: "", significance: "", takeaway: "", purposes: [] };
  const sceneWordCount = (localScene.sceneContent ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const isFirstScene = (localScene.order ?? 0) === 1;
  const sceneFinished =
    sceneWordCount >= 200 ||
    localScene.completenessStatus === "drafted" ||
    localScene.completenessStatus === "completed";
  const isGrowthState = isFirstScene && sceneFinished;
  const canAddAnotherScene = (localScene.order ?? 0) > 1 || isGrowthState;

  const handleUpdate = useCallback(async (updates: Partial<Scene>) => {
    setLocalScene(prev => ({ ...prev, ...updates }));
    setIsSaving(true);
    try {
      await updateScene(scene.id, storyId, updates);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [scene.id, storyId]);

  // Debounced save for text fields
  useEffect(() => {
    const timer = setTimeout(() => {
       // Logic handled in onChange handlers directly calling handleUpdate mostly, 
       // but for text areas we might want to debounce. 
       // For simplicity in this v1, I'll trigger save onBlur or specific actions, 
       // or use a separate debounced effect if needed.
       // Let's rely on onBlur for text areas to avoid too many DB calls.
    }, 1000);
    return () => clearTimeout(timer);
  }, [localScene]);

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (focus === "canvas") {
      editorCanvasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const updateAction = (field: keyof MovieTimeAction, value: any) => {
    const current = getAction();
    handleUpdate({ movieTimeAction: { ...current, [field]: value } });
  };

  const updateEmotion = (field: keyof MovieTimeEmotion, value: any) => {
    const current = getEmotion();
    handleUpdate({ movieTimeEmotion: { ...current, [field]: value } });
  };

  const updateMeaning = (field: keyof MovieTimeMeaning, value: any) => {
    const current = getMeaning();
    handleUpdate({ movieTimeMeaning: { ...current, [field]: value } });
  };

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const draft = await generateSceneDraftAction({
        movieTimeAction: getAction(),
        movieTimeEmotion: getEmotion(),
        movieTimeMeaning: getMeaning(),
        requestId: crypto.randomUUID(),
      }, storyId);

      if (isInsufficientCreditsPayload(draft)) {
        router.push(INSUFFICIENT_CREDITS_PATH);
        return;
      }
      if (isAiActionError(draft)) {
        setGenerationError(draft.error);
        return;
      }
      
      handleUpdate({ sceneContent: draft, completenessStatus: 'drafted' });
      setActiveTab('draft');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : typeof error === "object" && error !== null && "message" in error
              ? String((error as { message?: unknown }).message || "")
              : "Failed to generate draft. Please try again.";
      setGenerationError(message || "Failed to generate draft. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!localScene.sceneContent) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeShowDontTellAction(localScene.sceneContent);
      setFeedback(result);
      handleUpdate({ lastFeedback: result, showTellScore: result.score });
    } catch (error) {
      alert("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSceneJump = (nextId: string) => {
    if (nextId && nextId !== scene.id) {
      router.push(`/stories/${storyId}/scenes/${nextId}`);
    }
  };

  const handleAddScene = async () => {
    if (!canAddAnotherScene || isAddingScene) return;
    setIsAddingScene(true);
    try {
      // Force-save current scene before moving to the next one.
      await updateScene(scene.id, storyId, {
        title: localScene.title,
        movieTimeAction: getAction(),
        movieTimeEmotion: getEmotion(),
        movieTimeMeaning: getMeaning(),
        sceneContent: localScene.sceneContent,
        completenessStatus: localScene.completenessStatus,
      });

      const nextSeed = {
        actionWhere: getAction().where,
        actionWhat: "",
        emotionCharacters: getEmotion().characters,
        emotionStakes: getEmotion().stakes,
        emotionTone: getEmotion().tone,
      };

      const newScene = await createScene(storyId, nextSeed);
      router.push(`/stories/${storyId}/scenes/${newScene.id}?focus=canvas`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Could not add a new scene. Please try again.");
    } finally {
      setIsAddingScene(false);
    }
  };

  const handleSuggestSensory = async () => {
      const actionData = getAction();
      if (!actionData.where || !actionData.what) {
          alert("Please fill in Where and What is happening first.");
          return;
      }
      try {
          const suggestions = await suggestSensoryDetailsAction(actionData.where, actionData.what);
          updateAction('sensory_details', [...(actionData.sensory_details || []), ...suggestions]);
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Link href={`/stories/${storyId}/scenes`} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex flex-col min-w-0">
               <span className="text-xs font-mono text-zinc-500">Scene {localScene.order || "?"}</span>
               <input 
                 value={localScene.title}
                 onChange={(e) => setLocalScene(prev => ({ ...prev, title: e.target.value }))}
                 onBlur={(e) => handleUpdate({ title: e.target.value })}
                 className="font-bold text-lg bg-transparent border-none focus:ring-0 p-0 text-zinc-900 dark:text-zinc-100"
               />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {canAddAnotherScene && (
              <button
                type="button"
                onClick={handleAddScene}
                disabled={isAddingScene}
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {isAddingScene ? "Adding..." : "+ Add Scene"}
              </button>
            )}
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                isGrowthState
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {isGrowthState ? "Growth state" : "Save state"}
            </span>
            <span className="text-xs text-zinc-400 min-w-[4rem] text-right">
              {isSaving ? "Saving..." : lastSaved ? "Saved" : ""}
            </span>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                <button 
                    onClick={() => setActiveTab('framework')}
                    className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === 'framework' ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                    Framework
                </button>
                <button 
                    onClick={() => setActiveTab('draft')}
                    className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === 'draft' ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                    Draft
                </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800 sm:border-0 sm:pt-0">
          <label htmlFor="scene-switcher" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Scenes
          </label>
          <select
            id="scene-switcher"
            value={scene.id}
            onChange={(e) => handleSceneJump(e.target.value)}
            className="text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 min-w-[12rem] max-w-[min(100vw-6rem,28rem)]"
          >
            {allScenes.map((s) => (
              <option key={s.id} value={s.id}>
                Scene {s.order}: {s.title}
              </option>
            ))}
          </select>
          {canAddAnotherScene ? (
            <div className="flex items-center gap-2">
              {isGrowthState && (
                <Link
                  href={`/stories/${storyId}/review`}
                  className="text-sm rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Finish & Export
                </Link>
              )}
            </div>
          ) : (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Reach 200+ words in scene 1 to unlock “Add scene”
            </span>
          )}
          <Link
            href={`/stories/${storyId}/scenes`}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 underline underline-offset-2"
          >
            All scenes
          </Link>
        </div>
        </div>
      </div>

      <div ref={editorCanvasRef} className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'framework' ? (
            <div className="grid gap-8">
                {/* ACTION SECTION */}
                <section className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-300">
                        <MapPin className="w-5 h-5" />
                        <h2 className="font-bold text-xl">ACTION</h2>
                        <span className="text-sm opacity-70 ml-2">Show, don't just tell</span>
                    </div>
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Where are we?</label>
                            <input 
                                className="w-full rounded-md border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                                placeholder="A cramped coffee shop in downtown Seattle..."
                                value={getAction().where}
                                onChange={(e) => updateAction('where', e.target.value)}
                                onBlur={(e) => updateAction('where', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">What is happening?</label>
                            <textarea 
                                className="w-full rounded-md border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 min-h-[100px]"
                                placeholder="Sarah slides the laptop across the table..."
                                value={getAction().what}
                                onChange={(e) => updateAction('what', e.target.value)}
                                onBlur={(e) => updateAction('what', e.target.value)}
                            />
                        </div>
                        <div>
                             <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Sensory Details</label>
                                <button onClick={handleSuggestSensory} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Auto-suggest
                                </button>
                             </div>
                             <div className="flex flex-wrap gap-2 mb-2">
                                {getAction().sensory_details?.map((detail, i) => (
                                    <span key={i} className="bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-2">
                                        {detail}
                                        <button onClick={() => {
                                            const newDetails = getAction().sensory_details.filter((_, idx) => idx !== i);
                                            updateAction('sensory_details', newDetails);
                                        }} className="text-zinc-400 hover:text-red-500">×</button>
                                    </span>
                                ))}
                             </div>
                             <input 
                                className="w-full rounded-md border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                                placeholder="Add a sensory detail (press Enter)"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = e.currentTarget.value.trim();
                                        if (val) {
                                            updateAction('sensory_details', [...(getAction().sensory_details || []), val]);
                                            e.currentTarget.value = "";
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </section>

                {/* EMOTION SECTION */}
                <section className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4 text-red-700 dark:text-red-300">
                        <Heart className="w-5 h-5" />
                        <h2 className="font-bold text-xl">EMOTION</h2>
                        <span className="text-sm opacity-70 ml-2">Connect to feelings</span>
                    </div>
                    <div className="grid gap-4">
                         <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Who is involved?</label>
                            <input 
                                className="w-full rounded-md border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2"
                                placeholder="Sarah, Marcus..."
                                value={getEmotion().characters}
                                onChange={(e) => updateEmotion('characters', e.target.value)}
                                onBlur={(e) => updateEmotion('characters', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">What is at stake?</label>
                            <textarea 
                                className="w-full rounded-md border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 min-h-[80px]"
                                placeholder="The company's future, their friendship..."
                                value={getEmotion().stakes}
                                onChange={(e) => updateEmotion('stakes', e.target.value)}
                                onBlur={(e) => updateEmotion('stakes', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Emotional Tone</label>
                            <div className="flex flex-wrap gap-2">
                                {['Joy', 'Fear', 'Anger', 'Sadness', 'Surprise', 'Disgust', 'Trust', 'Anticipation', 'Neutral'].map(tone => (
                                    <button 
                                        key={tone}
                                        onClick={() => updateEmotion('tone', tone)}
                                        className={`px-3 py-1 rounded-full text-sm border ${getEmotion().tone === tone ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-red-300'}`}
                                    >
                                        {tone}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* MEANING SECTION */}
                <section className="bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4 text-green-700 dark:text-green-300">
                        <Lightbulb className="w-5 h-5" />
                        <h2 className="font-bold text-xl">MEANING</h2>
                        <span className="text-sm opacity-70 ml-2">What's the point?</span>
                    </div>
                     <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">What changed?</label>
                            <textarea 
                                className="w-full rounded-md border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 min-h-[80px]"
                                placeholder="Sarah realized she had to decide alone..."
                                value={getMeaning().change}
                                onChange={(e) => updateMeaning('change', e.target.value)}
                                onBlur={(e) => updateMeaning('change', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Why does this matter? (Takeaway)</label>
                            <textarea 
                                className="w-full rounded-md border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 min-h-[80px]"
                                placeholder="Sometimes the hardest truth is admitting..."
                                value={getMeaning().takeaway}
                                onChange={(e) => updateMeaning('takeaway', e.target.value)}
                                onBlur={(e) => updateMeaning('takeaway', e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                <div className="flex flex-col items-center gap-3 pt-8">
                    {generationError ? (
                      <p className="max-w-lg text-center text-sm text-red-600 dark:text-red-400">
                        {generationError}
                      </p>
                    ) : null}
                    <button 
                        onClick={handleGenerateDraft}
                        disabled={isGenerating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Generating Scene...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generate Scene Draft
                            </>
                        )}
                    </button>
                </div>
            </div>
        ) : (
            <div className="grid gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm min-h-[500px]">
                    <textarea 
                        className="w-full h-full min-h-[500px] resize-none border-none focus:ring-0 text-lg leading-relaxed bg-transparent text-zinc-800 dark:text-zinc-200 font-serif"
                        placeholder="Your scene draft will appear here..."
                        value={localScene.sceneContent || ""}
                        onChange={(e) => {
                            setLocalScene(prev => ({ ...prev, sceneContent: e.target.value }));
                        }}
                        onBlur={(e) => handleUpdate({ sceneContent: e.target.value })}
                    />
                </div>

                <div className="flex justify-between items-start">
                    <button 
                         onClick={handleAnalyze}
                         disabled={isAnalyzing || !localScene.sceneContent}
                         className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium px-4 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 disabled:opacity-50"
                    >
                        <Target className="w-4 h-4" />
                        {isAnalyzing ? "Analyzing..." : "Get Show Don't Tell Feedback"}
                    </button>
                    
                    {feedback && (
                        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 max-w-md">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-sm uppercase text-zinc-500">Analysis Result</h3>
                                <span className={`font-bold px-2 py-0.5 rounded text-sm ${feedback.score >= 8 ? 'bg-green-100 text-green-800' : feedback.score >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                    Score: {feedback.score}/10
                                </span>
                            </div>
                            <p className="text-sm font-medium mb-3">Top Priority: {feedback.topPriority}</p>
                            
                            {feedback.tellingPhrases?.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-zinc-500">Telling Phrases Found:</p>
                                    {feedback.tellingPhrases.map((phrase: any, i: number) => (
                                        <div key={i} className="text-sm bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-700">
                                            <span className="text-red-500 line-through mr-2">{phrase.original}</span>
                                            <span className="text-green-600 font-medium">{phrase.suggestion}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}







