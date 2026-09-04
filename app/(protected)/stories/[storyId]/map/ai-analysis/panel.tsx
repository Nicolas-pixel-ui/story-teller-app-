"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INSUFFICIENT_CREDITS_PATH, isInsufficientCreditsPayload } from "@/lib/credits/constants";
import { analyzeStoryMap } from "../actions";
import { useMap } from "../map-context";
import { cn } from "@/lib/utils";

export function AIAnalysisPanel() {
  const router = useRouter();
  const { storyId } = useMap();
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const handleAnalyze = () => {
    startTransition(async () => {
      const result = await analyzeStoryMap(storyId);
      if (isInsufficientCreditsPayload(result)) {
        router.push(INSUFFICIENT_CREDITS_PATH);
        return;
      }
      setAnalysis(result);
      router.refresh();
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm transition-colors"
      >
        <span>🤖</span> Analyze Story
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(false)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md shadow-sm transition-colors"
      >
        <span>✕</span> Close Analysis
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col transition-transform transform translate-y-0">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            🤖 AI Story Analysis
            {isPending && <span className="text-xs font-normal text-purple-500 animate-pulse">Analyzing...</span>}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={isPending}
              className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 rounded disabled:opacity-50"
            >
              {analysis ? "Re-analyze" : "Run Analysis"}
            </button>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-700">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!analysis ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <p className="mb-4">Run AI analysis to get insights on pacing, structure, and character arcs.</p>
              <button
                onClick={handleAnalyze}
                disabled={isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isPending ? "Analyzing..." : "Start Analysis"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnalysisCard title="Pacing" data={analysis.pacing} />
              <AnalysisCard title="Emotional Arc" data={analysis.emotional_arc} />
              <AnalysisCard title="Structural Integrity" data={analysis.structural_integrity} />
              <AnalysisCard title="Character Journeys" data={analysis.character_journeys} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function AnalysisCard({ title, data }: { title: string; data: any }) {
  if (!data) return null;
  
  const scoreColor = 
    data.score === "good" ? "text-green-600 bg-green-50 border-green-200" :
    data.score === "warning" ? "text-yellow-600 bg-yellow-50 border-yellow-200" :
    "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white dark:bg-zinc-800">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">{title}</h4>
        <span className={cn("text-xs px-2 py-0.5 rounded border uppercase", scoreColor)}>
          {data.score}
        </span>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{data.assessment}</p>
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-500 uppercase">Recommendations</p>
          <ul className="list-disc list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            {data.recommendations.map((rec: string, i: number) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

