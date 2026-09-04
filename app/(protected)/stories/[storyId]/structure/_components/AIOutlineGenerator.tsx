import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StoryStructure } from '@/lib/data/structures';
import { INSUFFICIENT_CREDITS_PATH, isInsufficientCreditsPayload } from '@/lib/credits/constants';
import { getStructureOutlineAction } from '../actions';

interface AIOutlineGeneratorProps {
  structure: StoryStructure;
  storyContext: any;
  initialOutline: any;
  onSave: (outline: any) => void;
}

export default function AIOutlineGenerator({ structure, storyContext, initialOutline, onSave }: AIOutlineGeneratorProps) {
  const router = useRouter();
  const [outline, setOutline] = useState<any[]>(initialOutline?.beats ? initialOutline.beats : []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!!initialOutline?.beats);

  const generateOutline = async () => {
    setIsGenerating(true);
    try {
      const generatedBeats = await getStructureOutlineAction(structure.id, storyContext);
      if (isInsufficientCreditsPayload(generatedBeats)) {
        router.push(INSUFFICIENT_CREDITS_PATH);
        return;
      }
      setOutline(generatedBeats);
      setHasGenerated(true);
      onSave({ generated: true, beats: generatedBeats, generatedAt: new Date().toISOString() });
      router.refresh();
    } catch (error) {
      console.error("Failed to generate outline", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateBeat = (index: number, content: string) => {
    const newOutline = [...outline];
    newOutline[index] = { ...newOutline[index], suggestion: content };
    setOutline(newOutline);
    onSave({ generated: true, beats: newOutline, generatedAt: initialOutline?.generatedAt || new Date().toISOString() });
  };

  useEffect(() => {
    if (!hasGenerated && !isGenerating && structure && (!initialOutline?.beats || initialOutline.beats.length === 0)) {
       // Auto-generate on first load if empty
       generateOutline();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isGenerating && outline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-zinc-600 dark:text-zinc-400">Generating your custom outline...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{structure.name} Outline</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            An AI-generated outline based on your story context. You can edit any part of it.
          </p>
        </div>
        <button 
          onClick={generateOutline} 
          disabled={isGenerating}
          className="text-sm px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-200"
        >
          {isGenerating ? 'Regenerating...' : '🔄 Regenerate'}
        </button>
      </div>

      <div className="space-y-6">
        {outline.map((beat: any, index: number) => (
          <div key={index} className="flex gap-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm">
              {index + 1}
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{beat.beatName}</h3>
                <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                  {beat.duration}
                </span>
              </div>
              <textarea
                value={beat.suggestion}
                onChange={(e) => updateBeat(index, e.target.value)}
                className="w-full p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[5rem]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}









