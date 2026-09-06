"use server";

// DO NOT import pdf-polyfills-init here - PDF parsing is now completely isolated via dynamic imports
// This prevents pdfjs-dist from being evaluated during module bundling

import { createClient } from "@/lib/supabase/server";
import { analyzeStyleFromText, StyleAnalysisResult } from "@/lib/ai/style-analyzer";
import { consumeCredit } from "@/lib/credits/service";
import { isInsufficientCredits } from "@/lib/credits/redirect";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 50000; // ~50K characters for AI analysis

interface AnalysisResponse {
  success: boolean;
  data?: StyleAnalysisResult;
  error?: string;
  insufficientCredits?: boolean;
}

async function debitAnalysisCredits(
  userId: string,
  reason: "style_analyze_document" | "style_analyze_url" | "style_analyze_text"
): Promise<AnalysisResponse | null> {
  try {
    const creditResult = await consumeCredit({
      userId,
      reason,
    });
    if (isInsufficientCredits(creditResult)) {
      return { success: false, error: "Insufficient credits", insufficientCredits: true };
    }
    return null;
  } catch (error) {
    console.error("[AI Actions] Credit debit failed:", error);
    return { success: false, error: "Could not verify credits. Please try again." };
  }
}

/**
 * Analyze a document file (PDF, DOCX, TXT) and extract style characteristics
 */
export async function analyzeDocumentAction(
  formData: FormData
): Promise<AnalysisResponse> {
  console.log('[AI Actions] Starting document analysis');
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('[AI Actions] Unauthorized access attempt');
    return { success: false, error: "Unauthorized" };
  }

  try {
    const file = formData.get("file") as File;
    
    if (!file) {
      console.error('[AI Actions] No file provided');
      return { success: false, error: "No file provided" };
    }

    console.log('[AI Actions] Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      console.error('[AI Actions] File too large:', sizeMB, 'MB');
      return { 
        success: false, 
        error: `File size exceeds 10MB limit (${sizeMB}MB)` 
      };
    }

    // Get file extension
    const fileName = file.name.toLowerCase();
    const fileType = fileName.endsWith('.pdf') 
      ? 'pdf' 
      : fileName.endsWith('.docx') 
      ? 'docx' 
      : fileName.endsWith('.txt') 
      ? 'txt' 
      : null;

    if (!fileType) {
      console.error('[AI Actions] Unsupported file type:', fileName);
      return { 
        success: false, 
        error: "Unsupported file type. Please upload PDF, DOCX, or TXT files." 
      };
    }

    console.log('[AI Actions] File type detected:', fileType);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('[AI Actions] File converted to buffer, size:', buffer.length);

    // Parse based on file type
    let parsedContent;
    console.log('[AI Actions] Starting file parsing...');
    
    switch (fileType) {
      case 'pdf':
        console.log('[AI Actions] Parsing PDF...');
        // Check if we're in an environment that supports PDF parsing
        // PDF parsing requires browser APIs that may not be available in serverless environments
        if (typeof (globalThis as any).DOMMatrix === 'undefined') {
          // Polyfills might not be available - return helpful error immediately
          return {
            success: false,
            error: "PDF parsing is not available in this environment. Please use DOCX or TXT files instead, or paste your content directly."
          };
        }
        try {
          // Dynamically import parsePDF only when needed to avoid evaluating pdfjs-dist during bundling
          const { parsePDF } = await import("@/lib/ai/content-parser");
          parsedContent = await parsePDF(buffer);
          if (parsedContent.error) {
            return {
              success: false,
              error: parsedContent.error
            };
          }
        } catch (error) {
          // If PDF parsing fails due to DOMMatrix or other issues, provide helpful error
          console.error('[AI Actions] PDF parsing failed:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: "PDF parsing is not available in this environment. Please use DOCX or TXT files instead, or paste your content directly."
          };
        }
        break;
      case 'docx':
        console.log('[AI Actions] Parsing DOCX...');
        const { parseDOCX } = await import("@/lib/ai/content-parser");
        parsedContent = await parseDOCX(buffer);
        break;
      case 'txt':
        console.log('[AI Actions] Parsing TXT...');
        const { parseText } = await import("@/lib/ai/content-parser");
        parsedContent = parseText(buffer.toString('utf-8'));
        break;
      default:
        return { success: false, error: "Unsupported file type" };
    }

    console.log('[AI Actions] Parsing complete:', {
      hasError: !!parsedContent.error,
      textLength: parsedContent.text.length,
      wordCount: parsedContent.wordCount
    });

    if (parsedContent.error) {
      console.error('[AI Actions] Parsing error:', parsedContent.error);
      return { success: false, error: parsedContent.error };
    }

    if (!parsedContent.text || parsedContent.text.length < 100) {
      console.error('[AI Actions] Document too short:', parsedContent.text.length);
      return { 
        success: false, 
        error: "Document appears to be empty or too short for analysis (minimum 100 characters)" 
      };
    }

    // Clean and truncate text for AI analysis
    console.log('[AI Actions] Cleaning and truncating text...');
    const { cleanText, truncateText } = await import("@/lib/ai/content-parser");
    const cleanedText = cleanText(parsedContent.text);
    const truncatedText = truncateText(cleanedText, MAX_TEXT_LENGTH);
    console.log('[AI Actions] Text prepared for AI:', {
      originalLength: parsedContent.text.length,
      cleanedLength: cleanedText.length,
      finalLength: truncatedText.length
    });

    // Analyze with AI
    console.log('[AI Actions] Starting AI analysis...');
    const debitError = await debitAnalysisCredits(user.id, "style_analyze_document");
    if (debitError) return debitError;
    const analysis = await analyzeStyleFromText(truncatedText);
    console.log('[AI Actions] AI analysis complete');

    return { success: true, data: analysis };
  } catch (error) {
    console.error("[AI Actions] Document analysis error:", error);
    
    // Provide detailed error information
    let errorMessage = "Failed to analyze document";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("[AI Actions] Error stack:", error.stack);
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

/**
 * Analyze content from a URL and extract style characteristics
 */
export async function analyzeUrlAction(url: string): Promise<AnalysisResponse> {
  console.log('[AI Actions] Starting URL analysis:', url);
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('[AI Actions] Unauthorized URL analysis attempt');
    return { success: false, error: "Unauthorized" };
  }

  try {
    if (!url || url.trim().length === 0) {
      console.error('[AI Actions] No URL provided');
      return { success: false, error: "No URL provided" };
    }

    console.log('[AI Actions] Fetching URL content...');
    // Parse URL content - dynamically import to avoid analyzing PDF code
    const { parseURL } = await import("@/lib/ai/content-parser");
    const parsedContent = await parseURL(url.trim());

    console.log('[AI Actions] URL parsing complete:', {
      hasError: !!parsedContent.error,
      textLength: parsedContent.text.length,
      wordCount: parsedContent.wordCount
    });

    if (parsedContent.error) {
      console.error('[AI Actions] URL parsing error:', parsedContent.error);
      return { success: false, error: parsedContent.error };
    }

    if (!parsedContent.text || parsedContent.text.length < 100) {
      console.error('[AI Actions] URL content too short:', parsedContent.text.length);
      return { 
        success: false, 
        error: "URL content appears to be empty or too short for analysis (minimum 100 characters)" 
      };
    }

    // Clean and truncate text for AI analysis
    console.log('[AI Actions] Preparing URL content for AI...');
    const { cleanText, truncateText: truncateTextUrl } = await import("@/lib/ai/content-parser");
    const cleanedText = cleanText(parsedContent.text);
    const truncatedText = truncateTextUrl(cleanedText, MAX_TEXT_LENGTH);

    // Analyze with AI
    console.log('[AI Actions] Starting AI analysis of URL content...');
    const debitError = await debitAnalysisCredits(user.id, "style_analyze_url");
    if (debitError) return debitError;
    const analysis = await analyzeStyleFromText(truncatedText);
    console.log('[AI Actions] URL analysis complete');

    return { success: true, data: analysis };
  } catch (error) {
    console.error("URL analysis error:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to analyze URL" 
    };
  }
}

/**
 * Analyze pasted text and extract style characteristics
 */
export async function analyzeTextAction(text: string): Promise<AnalysisResponse> {
  console.log('[AI Actions] Starting text analysis, length:', text.length);
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('[AI Actions] Unauthorized text analysis attempt');
    return { success: false, error: "Unauthorized" };
  }

  try {
    if (!text || text.trim().length === 0) {
      console.error('[AI Actions] No text provided');
      return { success: false, error: "No text provided" };
    }

    if (text.trim().length < 100) {
      console.error('[AI Actions] Text too short:', text.trim().length);
      return { 
        success: false, 
        error: "Text is too short for analysis (minimum 100 characters)" 
      };
    }

    // Clean and truncate text for AI analysis
    console.log('[AI Actions] Cleaning and preparing text...');
    const { cleanText, truncateText: truncateTextAnalysis } = await import("@/lib/ai/content-parser");
    const cleanedText = cleanText(text);
    const truncatedText = truncateTextAnalysis(cleanedText, MAX_TEXT_LENGTH);
    console.log('[AI Actions] Text prepared, final length:', truncatedText.length);

    // Analyze with AI
    console.log('[AI Actions] Starting AI analysis of text...');
    const debitError = await debitAnalysisCredits(user.id, "style_analyze_text");
    if (debitError) return debitError;
    const analysis = await analyzeStyleFromText(truncatedText);
    console.log('[AI Actions] Text analysis complete');

    return { success: true, data: analysis };
  } catch (error) {
    console.error("Text analysis error:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to analyze text" 
    };
  }
}


