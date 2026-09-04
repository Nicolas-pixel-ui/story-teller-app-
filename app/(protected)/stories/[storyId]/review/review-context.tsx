"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { INSUFFICIENT_CREDITS_PATH, isInsufficientCreditsPayload } from "@/lib/credits/constants";
import { isAiActionError } from "@/lib/ai/action-result";
import { saveStoryDraft, generateDraftAction, improveTextAction, recordExport } from "./actions";
import { exportStory as exportFile } from "@/lib/export";

interface ReviewContextType {
  storyId: string;
  story: any;
  scenes: any[];
  draftContent: string;
  setDraftContent: (content: string) => void;
  isGenerating: boolean;
  generateDraft: (options: any) => Promise<void>;
  saveDraft: () => Promise<void>;
  exportStory: (format: "pdf" | "docx" | "md" | "txt" | "wiki") => Promise<void>;
  improveText: (text: string, type: any) => Promise<string>;
}

const ReviewContext = createContext<ReviewContextType | null>(null);

export function ReviewProvider({ 
    children, 
    storyId, 
    story, 
    scenes 
}: { 
    children: ReactNode, 
    storyId: string, 
    story: any, 
    scenes: any[] 
}) {
    // Initialize with story.draftContent. If it's JSON object (from old saves?), stringify it?
    // Assume it's string (HTML or Markdown) for now.
    const [draftContent, setDraftContent] = useState<string>(
        typeof story.draftContent === 'string' ? story.draftContent : 
        (story.draftContent ? JSON.stringify(story.draftContent) : "")
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const router = useRouter();

    const generateDraft = async (options: any) => {
        setIsGenerating(true);
        try {
            const draft = await generateDraftAction(storyId, options);
            if (isInsufficientCreditsPayload(draft)) {
                router.push(INSUFFICIENT_CREDITS_PATH);
                return;
            }
            if (isAiActionError(draft)) {
                throw new Error(draft.error);
            }
            if (typeof draft !== "string") {
                throw new Error("Failed to generate draft. Please try again.");
            }
            // Replace content entirely
            setDraftContent(draft);
            
            // Force a slight delay before saving to ensure state matches
            setTimeout(async () => {
                await saveStoryDraft(storyId, draft); // Auto save
            }, 100);
        } finally {
            setIsGenerating(false);
        }
    };

    const saveDraft = async () => {
        await saveStoryDraft(storyId, draftContent);
    };

    const improveText = async (text: string, type: any) => {
        return await improveTextAction(text, type);
    };

    const exportStoryHandler = async (format: "pdf" | "docx" | "md" | "txt" | "wiki") => {
         // Prepare content: if HTML, strip tags for simple formats, or handle accordingly.
         let contentToExport = draftContent;
         if (draftContent.trim().startsWith("<") && format !== 'wiki') { // Keep structure for wiki? Or strip? Wiki generator handles plain text logic mostly.
            const tmp = document.createElement("DIV");
            tmp.innerHTML = draftContent;
            contentToExport = tmp.textContent || tmp.innerText || "";
         }

         // Pass full story data for wiki generation
         await exportFile(story.title, contentToExport, format, { ...story, scenes });
         if (format !== 'wiki') { // Don't track wiki export yet? Or track as txt?
             await recordExport(storyId, format);
         }
    };

    return (
        <ReviewContext.Provider value={{
            storyId,
            story,
            scenes,
            draftContent,
            setDraftContent,
            isGenerating,
            generateDraft,
            saveDraft,
            exportStory: exportStoryHandler,
            improveText
        }}>
            {children}
        </ReviewContext.Provider>
    );
}

export function useReview() {
    const context = useContext(ReviewContext);
    if (!context) throw new Error("useReview must be used within ReviewProvider");
    return context;
}


