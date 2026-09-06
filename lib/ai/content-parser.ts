// DO NOT import pdf-polyfills-init here - it will be imported dynamically when parsePDF is called
// This prevents any PDF-related code from being evaluated during module bundling

import mammoth from "mammoth";
import { assertSafePublicHttpUrl } from "@/lib/security/safe-url";

export interface ParsedContent {
  text: string;
  wordCount: number;
  error?: string;
}


/**
 * Parse PDF file buffer and extract text content
 * Works in serverless environments without canvas dependencies
 * 
 * NOTE: PDF parsing may fail in some serverless environments due to pdfjs-dist
 * requiring browser APIs. If this fails, users should use DOCX or TXT files instead.
 * 
 * This function uses dynamic imports to avoid evaluating pdfjs-dist during module bundling.
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedContent> {
  // Dynamically import the wrapper - its IIFE will set up polyfills when imported
  // This ensures polyfills are set up before pdfjs-dist code runs, but only when actually needed
  const { parsePDFSafe } = await import("./pdf-parser-wrapper");
  return parsePDFSafe(buffer);
}

/**
 * Parse DOCX file buffer and extract text content
 */
export async function parseDOCX(buffer: Buffer): Promise<ParsedContent> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    
    return {
      text,
      wordCount: text.split(/\s+/).length,
    };
  } catch (error) {
    console.error("DOCX parsing error:", error);
    return {
      text: "",
      wordCount: 0,
      error: error instanceof Error ? error.message : "Failed to parse DOCX",
    };
  }
}

/**
 * Parse plain text file
 */
export function parseText(text: string): ParsedContent {
  const cleaned = text.trim();
  return {
    text: cleaned,
    wordCount: cleaned.split(/\s+/).length,
  };
}

/**
 * Fetch and parse content from URL
 */
export async function parseURL(url: string): Promise<ParsedContent> {
  try {
    // Validate URL format and block private/metadata targets (SSRF).
    assertSafePublicHttpUrl(url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StoryTellerBot/1.0)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Basic HTML text extraction (remove scripts, styles, and tags)
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    return {
      text,
      wordCount: text.split(/\s+/).length,
    };
  } catch (error) {
    console.error("URL parsing error:", error);
    return {
      text: "",
      wordCount: 0,
      error: error instanceof Error ? error.message : "Failed to fetch URL",
    };
  }
}

/**
 * Truncate text to a maximum character limit while preserving word boundaries
 */
export function truncateText(text: string, maxChars: number = 50000): string {
  if (text.length <= maxChars) {
    return text;
  }
  
  // Find last space before maxChars to avoid cutting words
  const truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
}

/**
 * Clean and normalize text for AI analysis
 */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .replace(/[ \t]+/g, ' ') // Normalize spaces
    .replace(/^\s+|\s+$/gm, '') // Trim lines
    .trim();
}

