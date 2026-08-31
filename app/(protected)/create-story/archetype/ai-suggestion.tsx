"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INSUFFICIENT_CREDITS_PATH } from "@/lib/credits/constants";
import type { ArchetypeSuggestion } from "@/lib/ai/archetype-suggest";

interface AIArchetypeSuggestionProps {
  context: {
    title: string;
    description: string;
    storyType?: string;
  };
  onSelect: (archetypeId: string) => void;
  onBrowseGrid: () => void;
}

export function AIArchetypeSuggestion({
  context,
  onSelect,
  onBrowseGrid,
}: AIArchetypeSuggestionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<ArchetypeSuggestion | null>(null);

  const fetchSuggestion = () => {
    startTransition(async () => {
      try {
        const requestId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : undefined;

        const response = await fetch("/api/create-story/archetype-suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context, requestId }),
        });

        if (response.status === 402) {
          router.push(INSUFFICIENT_CREDITS_PATH);
          return;
        }

        const payload = (await response.json()) as {
          suggestion?: ArchetypeSuggestion;
          insufficientCredits?: boolean;
        };

        if (payload.insufficientCredits) {
          router.push(INSUFFICIENT_CREDITS_PATH);
          return;
        }

        if (payload.suggestion?.primaryRecommendation) {
          setSuggestion(payload.suggestion);
          return;
        }

        onBrowseGrid();
      } catch (err) {
        console.error(err);
        onBrowseGrid();
      }
    });
  };

  if (!suggestion && !isPending) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Find Your Perfect Archetype
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            Let AI analyze your story context to recommend the best character archetype for your goals.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button
            onClick={fetchSuggestion}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <span>✨</span> Get AI Suggestion
          </button>
          <button
            onClick={onBrowseGrid}
            className="flex-1 px-6 py-3 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors"
          >
            Browse Grid
          </button>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-purple-200 dark:border-purple-900 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="space-y-2 animate-pulse">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Analyzing your story...
          </h3>
          <div className="space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
            <p>✨ Reviewing story type...</p>
            <p>🎯 Understanding audience...</p>
            <p>🔍 Finding the perfect archetype...</p>
          </div>
        </div>
        <button
          onClick={onBrowseGrid}
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline"
        >
          Skip and browse archetypes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-2xl p-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
          <span>✨</span> Top Recommendation ({suggestion?.confidence} confidence)
        </div>

        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 capitalize">
          {suggestion?.primaryRecommendation.replace("-", " ")}
        </h2>

        <p className="text-lg text-zinc-700 dark:text-zinc-300 max-w-2xl mx-auto mb-8">
          {suggestion?.reasoning}
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => onSelect(suggestion?.primaryRecommendation || "")}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
          >
            Accept Suggestion
          </button>
          <button
            onClick={onBrowseGrid}
            className="px-6 py-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors"
          >
            See All Options
          </button>
        </div>
      </div>

      {suggestion?.alternativeOptions && suggestion.alternativeOptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 pl-2">
            Alternative Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestion.alternativeOptions.map((alt) => (
              <button
                key={alt.archetypeId}
                onClick={() => onSelect(alt.archetypeId)}
                className="flex flex-col p-4 text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all"
              >
                <span className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 capitalize">
                  {alt.archetypeId.replace("-", " ")}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {alt.reason}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
