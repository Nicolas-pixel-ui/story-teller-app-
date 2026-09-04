"use client";

import { useState } from "react";
import { hookTypes, HookTypeID } from "@/lib/data/hookTypes";
import { generateHooksAction, saveSelectedHookAction, saveManualHookAction, refineHookAction } from "./actions";
import { useRouter } from "next/navigation";
import { INSUFFICIENT_CREDITS_PATH, isInsufficientCreditsPayload } from "@/lib/credits/constants";
import { Loader2, Wand2, Check, X, Edit2, RotateCcw } from "lucide-react";

interface GeneratedHook {
  text: string;
  whyItWorks: string;
  tone: string;
}

interface StoryHooksProps {
  storyId: string;
  existingHooks: any;
}

export default function StoryHooks({ storyId, existingHooks }: StoryHooksProps) {
  const router = useRouter();
  const [selectedTypes, setSelectedTypes] = useState<HookTypeID[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHooks, setGeneratedHooks] = useState<Record<string, GeneratedHook[]>>(
    existingHooks?.generated || {}
  );
  const [chosenHook, setChosenHook] = useState<any>(existingHooks?.chosen || null);
  
  // Manual Hook State
  const [manualHookText, setManualHookText] = useState(existingHooks?.manualHook?.text || "");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // Editing State
  const [editingHookId, setEditingHookId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const toggleType = (id: HookTypeID) => {
    if (selectedTypes.includes(id)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== id));
    } else {
      setSelectedTypes([...selectedTypes, id]);
    }
  };

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) return;

    setIsGenerating(true);
    try {
      const result = await generateHooksAction(storyId, selectedTypes);
      if (isInsufficientCreditsPayload(result)) {
        router.push(INSUFFICIENT_CREDITS_PATH);
        return;
      }
      if ("error" in result && result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to generate hooks", error);
      alert("Failed to generate hooks. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectHook = async (type: string, text: string, index?: number) => {
    const hookId = index !== undefined ? `${type}_${index}` : 'manual';
    try {
      await saveSelectedHookAction(storyId, hookId, type, text);
      setChosenHook({
        id: hookId,
        type,
        text: text,
        selectedAt: new Date().toISOString(),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to select hook", error);
    }
  };

  const handleSaveManualHook = async () => {
    if (!manualHookText.trim()) return;
    
    setIsSavingManual(true);
    try {
      await saveManualHookAction(storyId, manualHookText);
      setChosenHook({
        id: 'manual',
        type: 'manual',
        text: manualHookText,
        selectedAt: new Date().toISOString(),
      });
      setShowManualInput(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to save manual hook", error);
    } finally {
      setIsSavingManual(false);
    }
  };

  const startEditing = (hookId: string, currentText: string) => {
    setEditingHookId(hookId);
    setEditingText(currentText);
  };

  const cancelEditing = () => {
    setEditingHookId(null);
    setEditingText("");
  };

  const saveEditedHook = async (type: string, index: number) => {
    const hookId = `${type}_${index}`;
    // Update local state first to reflect changes immediately in UI if needed, 
    // but really we want to update the "chosen" state if this hook was chosen,
    // or just update the list. 
    // For simplicity, if we edit a generated hook, we can just treat it as selecting it with new text.
    // However, the spec implies we can edit it and it stays in the list as modified.
    // Since we don't have a complex "update generated hook" action, let's just select it as the chosen one.
    // This simplifies the flow: "Refine" -> "Save" = "Select this new version".
    
    await handleSelectHook(type, editingText, index);
    setEditingHookId(null);
  };

  const handleRefine = async (refinementType: string) => {
    if (!editingText) return;
    setIsRefining(true);
    try {
      const result = await refineHookAction(storyId, editingText, refinementType);
      if (isInsufficientCreditsPayload(result)) {
        router.push(INSUFFICIENT_CREDITS_PATH);
        return;
      }
      if ("error" in result && result.error) {
        alert(result.error);
        return;
      }
      if (result.success && result.refinedText) {
        setEditingText(result.refinedText);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to refine hook", error);
    } finally {
      setIsRefining(false);
    }
  };

  const hasResults = Object.keys(generatedHooks || {}).length > 0;

  return (
    <div className="mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Hook Generator
        </h2>
        {!showManualInput && (
          <button
            onClick={() => setShowManualInput(true)}
            className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 underline"
          >
            Write my own hook
          </button>
        )}
      </div>

      {/* Manual Hook Input */}
      {showManualInput && (
        <div className="mb-8 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Write Your Own Hook
          </h3>
          <textarea
            value={manualHookText}
            onChange={(e) => setManualHookText(e.target.value)}
            placeholder="Write your opening hook here..."
            className="w-full p-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none mb-4 min-h-[100px]"
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowManualInput(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveManualHook}
              disabled={isSavingManual || !manualHookText.trim()}
              className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {isSavingManual ? "Saving..." : "Save & Use Hook"}
            </button>
          </div>
        </div>
      )}

      {/* Preview of Chosen Hook */}
      {chosenHook && (
        <div className="mb-12 p-6 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              Currently Selected Hook
            </h3>
          </div>
          <p className="text-xl font-medium text-zinc-900 dark:text-zinc-100 italic mb-2">
            "{chosenHook.text}"
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Type: {chosenHook.type === 'manual' ? 'Manual' : hookTypes.find(t => t.id === chosenHook.type)?.name || chosenHook.type}
          </p>
        </div>
      )}

      {/* Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {hookTypes.map((type) => {
          const isSelected = selectedTypes.includes(type.id);
          const hasGeneratedForThis = generatedHooks[type.id]?.length > 0;

          return (
            <div
              key={type.id}
              onClick={() => toggleType(type.id)}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                isSelected
                  ? "border-black dark:border-white bg-zinc-50 dark:bg-zinc-900"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-3xl">{type.icon}</span>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected
                      ? "bg-black dark:bg-white border-black dark:border-white"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {isSelected && (
                    <Check className="w-3 h-3 text-white dark:text-black" />
                  )}
                </div>
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                {type.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                {type.tagline}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
                {type.description}
              </p>
              {hasGeneratedForThis && (
                <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                  Generated
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mb-12">
        <button
          onClick={handleGenerate}
          disabled={selectedTypes.length === 0 || isGenerating}
          className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate Hooks
            </>
          )}
        </button>
      </div>

      {/* Results Display */}
      {hasResults && (
        <div className="space-y-12">
            <div className="flex justify-end">
             <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {isGenerating ? "Generating..." : "Generate More Hooks"}
              </button>
            </div>
          {Object.entries(generatedHooks).map(([typeId, hooks]) => {
            const typeInfo = hookTypes.find((t) => t.id === typeId);
            if (!typeInfo || !hooks) return null;

            return (
              <div key={typeId} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {typeInfo.name} Hooks
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {hooks.map((hook, idx) => {
                    const hookId = `${typeId}_${idx}`;
                    const isChosen = chosenHook?.id === hookId;
                    const isEditing = editingHookId === hookId;

                    if (isEditing) {
                        return (
                            <div key={idx} className="rounded-lg border border-purple-300 dark:border-purple-700 p-6 flex flex-col bg-white dark:bg-zinc-900 shadow-lg ring-1 ring-purple-500">
                                <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Edit2 className="w-3 h-3" />
                                    Refining Hook
                                </h4>
                                <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full p-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 mb-4 min-h-[120px] text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                />
                                
                                {/* AI Refinement Tools */}
                                <div className="mb-4 flex flex-wrap gap-2">
                                    <span className="text-xs text-zinc-500 flex items-center mr-1">AI Assist:</span>
                                    {['More Emotional', 'Surprising', 'Concise', 'Punchy'].map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => handleRefine(option.toLowerCase())}
                                            disabled={isRefining}
                                            className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                                        >
                                            {option}
                                        </button>
                                    ))}
                                    {isRefining && <Loader2 className="w-3 h-3 animate-spin text-purple-500 ml-2" />}
                                </div>

                                <div className="flex justify-between items-center mt-auto pt-2">
                                    <button
                                        onClick={cancelEditing}
                                        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-3 py-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => saveEditedHook(typeId, idx)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                    >
                                        Save & Use
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    return (
                      <div
                        key={idx}
                        className={`rounded-lg border p-6 flex flex-col relative ${
                          isChosen
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/10 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-black"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        }`}
                      >
                        {isChosen && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> SELECTED
                          </div>
                        )}
                        <div className="mb-4 flex-grow">
                          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100 italic">
                            "{hook.text}"
                          </p>
                        </div>
                        <div className="mb-6 text-sm">
                          <span className="font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                            Why this works:
                          </span>
                          <p className="text-zinc-600 dark:text-zinc-300">
                            {hook.whyItWorks}
                          </p>
                        </div>
                        <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center gap-2">
                          <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
                            {hook.tone}
                          </span>
                          <div className="flex gap-2">
                            <button
                                onClick={() => startEditing(hookId, hook.text)}
                                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                title="Refine this hook"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleSelectHook(typeId, hook.text, idx)}
                                className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
                                isChosen
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                    : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
                                }`}
                            >
                                {isChosen ? "Selected" : "Use This"}
                            </button>
                          </div>
                        </div>
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
  );
}
