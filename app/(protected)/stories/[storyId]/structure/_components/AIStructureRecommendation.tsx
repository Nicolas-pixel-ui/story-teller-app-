import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { INSUFFICIENT_CREDITS_PATH, isInsufficientCreditsPayload } from '@/lib/credits/constants';
import { getAIStructureRecommendationAction } from '../actions';
import { StoryStructure } from '@/lib/data/structures';

interface AIStructureRecommendationProps {
  storyContext: any;
  onSelectStructure: (structureId: string) => void;
  availableStructures: StoryStructure[];
}

export default function AIStructureRecommendation({ storyContext, onSelectStructure, availableStructures }: AIStructureRecommendationProps) {
  const router = useRouter();
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetRecommendation = async () => {
    setIsLoading(true);
    try {
      const rec = await getAIStructureRecommendationAction(storyContext);
      if (isInsufficientCreditsPayload(rec)) {
        router.push(INSUFFICIENT_CREDITS_PATH);
        return;
      }
      setRecommendation(rec);
      router.refresh();
    } catch (error) {
      console.error("Failed to get recommendation", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!recommendation && !isLoading) {
    return (
      <div className="text-center my-8 p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20">
        <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Not sure which structure fits?</h3>
        <p className="text-indigo-700 dark:text-indigo-400 mb-4">Let AI analyze your story and recommend the best narrative framework.</p>
        <button 
          onClick={handleGetRecommendation}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
        >
          ✨ Get AI Recommendation
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center my-8 p-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-zinc-600 dark:text-zinc-400">Analyzing your story structure...</p>
      </div>
    );
  }

  const primaryStructure = availableStructures.find(s => s.id === recommendation.primary.structureId);

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-zinc-900 rounded-xl border border-indigo-200 dark:border-indigo-800">
       <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
         <span>✨</span> AI Recommendation
       </h3>
       
       <div className="flex flex-col md:flex-row gap-6">
          {primaryStructure && (
            <div className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900 shadow-sm">
               <div className="flex justify-between items-start mb-2">
                 <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{primaryStructure.name}</h4>
                 <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full capitalize">
                   {recommendation.primary.confidence} Confidence
                 </span>
               </div>
               <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{recommendation.primary.reasoning}</p>
               <button 
                 onClick={() => onSelectStructure(primaryStructure.id)}
                 className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
               >
                 Select This Structure
               </button>
            </div>
          )}

          <div className="flex-1 space-y-3">
             <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Alternatives</h4>
             {recommendation.alternatives.map((alt: any, i: number) => {
               const struct = availableStructures.find(s => s.id === alt.structureId);
               if (!struct) return null;
               return (
                 <div key={i} className="flex items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded border border-zinc-200 dark:border-zinc-800">
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 block">{struct.name}</span>
                      <span className="text-xs text-zinc-500">{alt.reason}</span>
                    </div>
                    <button 
                      onClick={() => onSelectStructure(struct.id)}
                      className="text-xs px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300"
                    >
                      Select
                    </button>
                 </div>
               );
             })}
          </div>
       </div>
    </div>
  );
}









