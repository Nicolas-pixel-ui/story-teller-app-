import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { INSUFFICIENT_CREDITS_PATH, isInsufficientCreditsPayload } from '@/lib/credits/constants';
import { isAiActionError } from '@/lib/ai/action-result';
import { rethrowIfRedirect } from '@/lib/navigation/redirect-error';
import { StoryStructure } from '@/lib/data/structures';
import { brandInkButtonClassName, brandInkButtonStyle } from '@/lib/ui/button-classes';
import { getBeatDraftAction } from '../actions';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface BeatByBeatEditorProps {
  structure: StoryStructure;
  storyContext: any;
  initialBeatsData: any[]; // The user's progress so far
  onSave: (beats: any[]) => void;
}

export default function BeatByBeatEditor({ structure, storyContext, initialBeatsData, onSave }: BeatByBeatEditorProps) {
  const router = useRouter();
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [beatsData, setBeatsData] = useState<any[]>(initialBeatsData || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentBeat = structure.beats[currentBeatIndex];
  const currentBeatData = beatsData.find(b => b.beatId === currentBeat.id) || { userContent: '' };

  useEffect(() => {
    // Ensure we have entries for all beats
    if (beatsData.length === 0) {
      setBeatsData(structure.beats.map(b => ({ beatId: b.id, beatName: b.name, userContent: '' })));
    }
  }, [structure, beatsData.length]);

  const handleContentChange = (content: string) => {
    const updatedBeats = [...beatsData];
    const index = updatedBeats.findIndex(b => b.beatId === currentBeat.id);
    if (index >= 0) {
      updatedBeats[index] = { ...updatedBeats[index], userContent: content };
    } else {
      updatedBeats.push({ beatId: currentBeat.id, beatName: currentBeat.name, userContent: content });
    }
    setBeatsData(updatedBeats);
  };
  
  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave(beatsData);
    }, 2000);
    return () => clearTimeout(timer);
  }, [beatsData, onSave]);

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      // Get previous beats for context - only send necessary data
      const previousBeats = beatsData
        .filter((b, i) => {
          const beatDefIndex = structure.beats.findIndex(sb => sb.id === b.beatId);
          return beatDefIndex < currentBeatIndex && b.userContent;
        })
        .map(b => ({
          beatName: b.beatName,
          userContent: b.userContent
        })); // Only send name and content, strip other fields

      // Create a sanitized context object to avoid sending the entire story object (which might be huge)
      const sanitizedContext = {
        storyType: storyContext.storyType,
        character: storyContext.character,
        audience: storyContext.audience,
        structure: {
          name: structure.name
        }
      };

      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : undefined;
      const draft = await getBeatDraftAction(
        currentBeat,
        sanitizedContext,
        previousBeats,
        requestId
      );
      if (isInsufficientCreditsPayload(draft)) {
        router.push(INSUFFICIENT_CREDITS_PATH);
        return;
      }
      if (isAiActionError(draft)) {
        setError(draft.error);
        return;
      }
      if (!draft || typeof draft !== "string") {
        throw new Error("No draft returned from AI service");
      }
      handleContentChange(draft);
      router.refresh();
    } catch (err: unknown) {
      rethrowIfRedirect(err);
      console.error("Failed to generate draft", err);
      setError(err instanceof Error ? err.message : "Failed to generate draft. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const nextBeat = () => {
    onSave(beatsData);
    if (currentBeatIndex < structure.beats.length - 1) {
      setCurrentBeatIndex(prev => prev + 1);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevBeat = () => {
    if (currentBeatIndex > 0) {
      setCurrentBeatIndex(prev => prev - 1);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinish = async () => {
    // Save current content first
    onSave(beatsData);
    // Maybe wait a moment or show a saving state?
    // For now, redirect to the story dashboard or review page
    router.push(`/stories/${storyContext.id}/review`);
  };

  return (
    <div className="flex h-[calc(100vh-100px)] border-t border-zinc-200 dark:border-zinc-800">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/50 p-4 hidden md:block">
        <h3 className="text-sm font-semibold text-zinc-500 mb-4 uppercase tracking-wide">Beats</h3>
        <div className="space-y-1">
          {structure.beats.map((beat, idx) => {
             const data = beatsData.find(b => b.beatId === beat.id);
             const isComplete = data?.userContent?.length > 10;
             const isCurrent = idx === currentBeatIndex;
             
             return (
               <button
                 key={beat.id}
                 onClick={() => setCurrentBeatIndex(idx)}
                 className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                   isCurrent 
                     ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium' 
                     : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                 }`}
               >
                 <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${
                   isComplete ? 'bg-green-500 border-green-500 text-white' : 'border-zinc-400 text-zinc-500'
                 }`}>
                   {isComplete && '✓'}
                 </span>
                 <span className="truncate">{idx + 1}. {beat.name}</span>
               </button>
             );
          })}
        </div>
      </div>

      {/* Main Editor */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 md:p-12 bg-white dark:bg-zinc-950">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
                Beat {currentBeatIndex + 1} of {structure.beats.length}
              </span>
              <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-xs rounded text-zinc-600">
                {currentBeat.duration || 'approx. 5-10%'}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{currentBeat.name}</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">{currentBeat.description}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 space-y-6">
               {/* Guidance Questions */}
               {currentBeat.guidance && (
                 <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/20">
                   <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                     <span>💭</span> Guiding Questions
                   </h4>
                   <ul className="list-disc list-inside space-y-1 text-sm text-indigo-800 dark:text-indigo-200">
                     {currentBeat.guidance.questions.map((q, i) => (
                       <li key={i}>{q}</li>
                     ))}
                   </ul>
                 </div>
               )}

               {/* Editor */}
               <div className="space-y-3">
                 <div className="flex justify-between items-center gap-3">
                   <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Your Beat Content</label>
                   {error && (
                     <div className="text-xs text-red-500 flex items-center gap-1">
                       <AlertCircle className="h-3 w-3" />
                       {error}
                     </div>
                   )}
                 </div>
                 <button 
                   type="button"
                   onClick={handleGenerateDraft}
                   disabled={isGenerating}
                   title="Uses 10 credits"
                   className={`${brandInkButtonClassName} w-full px-5 py-3.5 text-base font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                   style={brandInkButtonStyle}
                 >
                   {isGenerating ? (
                     <>
                       <Loader2 className="h-5 w-5 animate-spin" />
                       Generating...
                     </>
                   ) : (
                     <>
                       <Sparkles className="h-5 w-5" />
                       Generate AI Draft
                       <span className="text-sm font-semibold opacity-90">−10 credits</span>
                     </>
                   )}
                 </button>
                 <textarea
                   value={currentBeatData.userContent || ''}
                   onChange={(e) => handleContentChange(e.target.value)}
                   className="w-full h-64 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                   placeholder="Write what happens in this beat..."
                 />
               </div>
            </div>

            {/* Examples Sidebar */}
            <div className="space-y-6">
              {currentBeat.guidance?.examples && (
                <div>
                   <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3 text-sm">Examples</h4>
                   <div className="space-y-3">
                     {currentBeat.guidance.examples.map((ex, i) => (
                       <div key={i} className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-100 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-400">
                         {ex}
                       </div>
                     ))}
                   </div>
                </div>
              )}
               {currentBeat.guidance?.explanation && (
                <div className="text-sm text-zinc-500 italic">
                   {currentBeat.guidance.explanation}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              type="button"
              onClick={prevBeat}
              disabled={currentBeatIndex === 0}
              className="px-4 py-2 text-zinc-600 disabled:opacity-50 hover:bg-zinc-100 rounded"
            >
              ← Previous Beat
            </button>
            
            {currentBeatIndex === structure.beats.length - 1 ? (
              <button 
                type="button"
                onClick={handleFinish}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              >
                Finish & Review ✓
              </button>
            ) : (
              <button 
                type="button"
                onClick={nextBeat}
                className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Next Beat →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
