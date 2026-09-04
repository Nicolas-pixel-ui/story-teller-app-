"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Upload, Link as LinkIcon, FileText, Sparkles, Loader2, CheckCircle, XCircle } from "lucide-react";
import { updateStyleGuide, addDictionaryEntry, deleteDictionaryEntry, updateDictionaryEntry } from "../actions";
import { analyzeDocumentAction, analyzeUrlAction, analyzeTextAction } from "../ai-actions";
import { tones, writingStyles, perspectives } from "@/lib/data/styleOptions";
import { InferSelectModel } from "drizzle-orm";
import { styleGuides, dictionaryEntries } from "@/lib/db/schema";
import { StyleAnalysisResult } from "@/lib/ai/style-analyzer";
import { BraveMenuSelect, StyleChoiceList } from "./style-choice";
import {
  brandInkButtonClassName,
  brandInkButtonStyle,
  brandStylePanelClassName,
  brandStylePanelStyle,
  brandStyleTabActiveClassName,
  brandStyleTabActiveStyle,
  brandStyleTabClassName,
  brandStyleTabStyle,
} from "@/lib/ui/button-classes";

type StyleGuide = InferSelectModel<typeof styleGuides>;
type DictionaryEntry = InferSelectModel<typeof dictionaryEntries>;

interface StyleGuideEditorProps {
  guide: StyleGuide;
  initialDictionary: DictionaryEntry[];
}

const COMPLEXITY_LEVELS = [
  "Elementary (6th Grade)",
  "Middle School (9th Grade)",
  "High School",
  "Undergraduate",
  "PhD / Technical",
];

const HEADING_FONTS = [
  "Inter",
  "Playfair Display",
  "Montserrat",
  "Poppins",
  "Roboto Slab",
  "Merriweather",
  "Oswald",
  "Raleway",
  "Bebas Neue",
  "Lora",
];

const BODY_FONTS = [
  "Inter",
  "Open Sans",
  "Roboto",
  "Lato",
  "Source Sans Pro",
  "Nunito",
  "Merriweather",
  "PT Sans",
  "Work Sans",
  "Crimson Text",
];

const DICTIONARY_CATEGORIES = [
  "Character Names",
  "Place Names",
  "Terminology",
  "Jargon",
  "Phrases",
  "Proper Nouns",
  "Technical Terms",
  "Slang",
  "Idioms",
  "General",
];

const TERM_TYPES = [
  "Noun",
  "Verb",
  "Adjective",
  "Adverb",
  "Phrase",
  "Acronym",
  "Abbreviation",
  "Other",
];

const IMPORTANCE_LEVELS = [
  "Essential",
  "Important",
  "Moderate",
  "Optional",
];

const USAGE_FREQUENCIES = [
  "Always",
  "Often",
  "Sometimes",
  "Rarely",
  "Context-dependent",
];

const COLOR_PALETTES = [
  {
    id: "modern-purple",
    name: "Modern Purple",
    colors: {
      primary: "#9333EA",
      secondary: "#EC4899",
      tertiary: "#8B5CF6",
      accent: "#F97316",
    },
  },
  {
    id: "professional-blue",
    name: "Professional Blue",
    colors: {
      primary: "#2563EB",
      secondary: "#0EA5E9",
      tertiary: "#3B82F6",
      accent: "#10B981",
    },
  },
  {
    id: "warm-sunset",
    name: "Warm Sunset",
    colors: {
      primary: "#DC2626",
      secondary: "#F59E0B",
      tertiary: "#EF4444",
      accent: "#F97316",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    colors: {
      primary: "#059669",
      secondary: "#10B981",
      tertiary: "#14B8A6",
      accent: "#84CC16",
    },
  },
  {
    id: "elegant-monochrome",
    name: "Elegant Monochrome",
    colors: {
      primary: "#1F2937",
      secondary: "#6B7280",
      tertiary: "#4B5563",
      accent: "#9333EA",
    },
  },
  {
    id: "creative-coral",
    name: "Creative Coral",
    colors: {
      primary: "#F43F5E",
      secondary: "#FB7185",
      tertiary: "#FD0A7B",
      accent: "#FBBF24",
    },
  },
];

export function StyleGuideEditor({ guide, initialDictionary }: StyleGuideEditorProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "visuals" | "dictionary" | "ai-import">("overview");
  const [isSaving, startTransition] = useTransition();
  const [formData, setFormData] = useState(guide);
  const [styleTextHidden, setStyleTextHidden] = useState(false);
  const [textHideMode, setTextHideMode] = useState<"opacity" | "visibility">("visibility");

  // Dictionary State
  const [dictionary, setDictionary] = useState(initialDictionary);
  const [newTerm, setNewTerm] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [newUsage, setNewUsage] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTermType, setNewTermType] = useState("");
  const [newImportance, setNewImportance] = useState("");
  const [newUsageFrequency, setNewUsageFrequency] = useState("");

  // Edit Dictionary Entry State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    term: "",
    definition: "",
    usageGuidelines: "",
    category: "",
    termType: "",
    importance: "",
    usageFrequency: "",
  });

  // AI Import State
  const [aiAnalysisMethod, setAiAnalysisMethod] = useState<"upload" | "url" | "text">("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<StyleAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    startTransition(async () => {
      await updateStyleGuide(guide.id, formData);
    });
  };

  const handleAddTerm = async () => {
    if (!newTerm.trim()) return;
    startTransition(async () => {
        await addDictionaryEntry(guide.id, {
            term: newTerm.trim(),
            definition: newDefinition.trim() || null,
            usageGuidelines: newUsage.trim() || null,
            category: newCategory || null,
            termType: newTermType || null,
            importance: newImportance || null,
            usageFrequency: newUsageFrequency || null,
        } as any);
        // Optimistic update for better UX
        setDictionary([...dictionary, {
            id: crypto.randomUUID(),
            styleGuideId: guide.id,
            term: newTerm.trim(),
            definition: newDefinition.trim() || null,
            usageGuidelines: newUsage.trim() || null,
            category: newCategory || "General",
            termType: newTermType || null,
            importance: newImportance || null,
            usageFrequency: newUsageFrequency || null,
            createdAt: new Date(),
            updatedAt: new Date()
        } as DictionaryEntry]);
        
        // Reset all fields
        setNewTerm("");
        setNewDefinition("");
        setNewUsage("");
        setNewCategory("");
        setNewTermType("");
        setNewImportance("");
        setNewUsageFrequency("");
    });
  };

  const handleDeleteTerm = async (id: string) => {
      setDictionary(dictionary.filter(d => d.id !== id));
      startTransition(async () => {
          await deleteDictionaryEntry(id, guide.id);
      });
  };

  const handleEditEntry = (entry: DictionaryEntry) => {
    setEditingEntryId(entry.id);
    setEditFormData({
      term: entry.term,
      definition: entry.definition || "",
      usageGuidelines: entry.usageGuidelines || "",
      category: entry.category || "",
      termType: entry.termType || "",
      importance: entry.importance || "",
      usageFrequency: entry.usageFrequency || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEntryId) return;
    
    startTransition(async () => {
      await updateDictionaryEntry(editingEntryId, editFormData as any);
    });
    
    // Optimistic update
    setDictionary(dictionary.map(entry => 
      entry.id === editingEntryId 
        ? { ...entry, ...editFormData, updatedAt: new Date() } as DictionaryEntry
        : entry
    ));
    
    setEditingEntryId(null);
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
  };

  const handleApplyPalette = (paletteId: string) => {
    const palette = COLOR_PALETTES.find(p => p.id === paletteId);
    if (!palette) return;
    
    setFormData({
      ...formData,
      primaryColor: palette.colors.primary,
      secondaryColor: palette.colors.secondary,
      tertiaryColor: palette.colors.tertiary,
      accentColor: palette.colors.accent,
      });
  };

  const handleChange = (field: keyof StyleGuide, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  // AI Import Handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size client-side before upload (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      setAnalysisError(`File size (${sizeMB}MB) exceeds the 10MB limit. Please use a smaller file.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setAnalysisProgress("Uploading and parsing document...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setAnalysisProgress("Extracting text content...");
      const result = await analyzeDocumentAction(formData);
      
      setIsAnalyzing(false);
      setAnalysisProgress("");

      if (result.success && result.data) {
        setAnalysisResult(result.data);
      } else {
        setAnalysisError(result.error || "Failed to analyze document");
      }
    } catch (error) {
      setIsAnalyzing(false);
      setAnalysisProgress("");
      setAnalysisError(error instanceof Error ? error.message : "An unexpected error occurred");
      console.error("File upload error:", error);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUrlAnalyze = async () => {
    if (!urlInput.trim()) {
      setAnalysisError("Please enter a URL");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setAnalysisProgress("Fetching content from URL...");

    try {
      const result = await analyzeUrlAction(urlInput.trim());
      
      setIsAnalyzing(false);
      setAnalysisProgress("");

      if (result.success && result.data) {
        setAnalysisResult(result.data);
      } else {
        setAnalysisError(result.error || "Failed to analyze URL");
      }
    } catch (error) {
      setIsAnalyzing(false);
      setAnalysisProgress("");
      setAnalysisError(error instanceof Error ? error.message : "An unexpected error occurred");
      console.error("URL analysis error:", error);
    }
  };

  const handleTextAnalyze = async () => {
    if (!textInput.trim()) {
      setAnalysisError("Please enter some text to analyze");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setAnalysisProgress("Analyzing writing style...");

    try {
      const result = await analyzeTextAction(textInput.trim());
      
      setIsAnalyzing(false);
      setAnalysisProgress("");

      if (result.success && result.data) {
        setAnalysisResult(result.data);
      } else {
        setAnalysisError(result.error || "Failed to analyze text");
      }
    } catch (error) {
      setIsAnalyzing(false);
      setAnalysisProgress("");
      setAnalysisError(error instanceof Error ? error.message : "An unexpected error occurred");
      console.error("Text analysis error:", error);
    }
  };

  const applyAnalysisResults = (partial: boolean = false) => {
    if (!analysisResult) return;

    const updates: Partial<StyleGuide> = {
      toneId: analysisResult.toneId,
      writingStyleId: analysisResult.writingStyleId,
      perspectiveId: analysisResult.perspectiveId,
      complexityLevel: analysisResult.complexityLevel,
      toneDescription: analysisResult.toneDescription,
    };

    setFormData({ ...formData, ...updates });

    // Add suggested terms to dictionary
    if (!partial && analysisResult.suggestedTerms.length > 0) {
      analysisResult.suggestedTerms.forEach(async (term) => {
        startTransition(async () => {
          await addDictionaryEntry(guide.id, {
            term: term.term,
            definition: term.definition || "",
            usageGuidelines: term.usageGuidelines || "",
            category: "General",
          } as any);
        });
        
        setDictionary([...dictionary, {
          id: crypto.randomUUID(),
          styleGuideId: guide.id,
          term: term.term,
          definition: term.definition || null,
          usageGuidelines: term.usageGuidelines || null,
          category: "General",
          createdAt: new Date(),
          updatedAt: new Date()
        } as DictionaryEntry]);
      });
    }

    // Clear analysis result
    setAnalysisResult(null);
    setAnalysisError(null);
    setUrlInput("");
    setTextInput("");
  };

  return (
    <div className="ui-style-shell container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/style-guide"
            className="p-2 rounded-full"
            style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}
            >
              {formData.name}
            </h1>
            <p
              className="text-sm"
              style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}
            >
              Edit Style Guide
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`${brandInkButtonClassName} px-4 py-2 text-sm disabled:opacity-50`}
          style={brandInkButtonStyle}
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar Tabs */}
        <div className="col-span-12 md:col-span-3 space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={activeTab === "overview" ? brandStyleTabActiveClassName : brandStyleTabClassName}
            style={activeTab === "overview" ? brandStyleTabActiveStyle : brandStyleTabStyle}
          >
            Overview & Tone
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("visuals")}
            className={activeTab === "visuals" ? brandStyleTabActiveClassName : brandStyleTabClassName}
            style={activeTab === "visuals" ? brandStyleTabActiveStyle : brandStyleTabStyle}
          >
            Visual Identity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dictionary")}
            className={activeTab === "dictionary" ? brandStyleTabActiveClassName : brandStyleTabClassName}
            style={activeTab === "dictionary" ? brandStyleTabActiveStyle : brandStyleTabStyle}
          >
            Dictionary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai-import")}
            className={activeTab === "ai-import" ? brandStyleTabActiveClassName : brandStyleTabClassName}
            style={activeTab === "ai-import" ? brandStyleTabActiveStyle : brandStyleTabStyle}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Import
            </div>
          </button>
        </div>

        {/* Content Area */}
        <div
          className={`col-span-12 md:col-span-9 ${brandStylePanelClassName} rounded-xl p-6`}
          style={brandStylePanelStyle}
        >
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  aria-pressed={styleTextHidden}
                  onClick={() => setStyleTextHidden((current) => !current)}
                  className={`${brandInkButtonClassName} px-4 py-2 text-sm w-fit`}
                  style={brandInkButtonStyle}
                >
                  {styleTextHidden ? "Show Style Text" : "Choose New Style"}
                </button>
                <fieldset className="ui-hide-mode">
                  <legend className="sr-only">How to hide style text</legend>
                  <label className="ui-hide-mode-option">
                    <input
                      type="radio"
                      name="style-text-hide-mode"
                      checked={textHideMode === "opacity"}
                      onChange={() => setTextHideMode("opacity")}
                    />
                    Opacity (keep spacing)
                  </label>
                  <label className="ui-hide-mode-option">
                    <input
                      type="radio"
                      name="style-text-hide-mode"
                      checked={textHideMode === "visibility"}
                      onChange={() => setTextHideMode("visibility")}
                    />
                    Visibility (no selection)
                  </label>
                </fieldset>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Guide Name</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <StyleChoiceList
                    label="Tone"
                    value={formData.toneId || ""}
                    options={tones.map((t) => ({ value: t.id, label: t.label }))}
                    onChange={(next) => handleChange("toneId", next)}
                  />
                  <StyleChoiceList
                    label="Writing Style"
                    value={formData.writingStyleId || ""}
                    options={writingStyles.map((s) => ({ value: s.id, label: s.label }))}
                    onChange={(next) => handleChange("writingStyleId", next)}
                  />
                  <StyleChoiceList
                    label="Perspective"
                    value={formData.perspectiveId || ""}
                    options={perspectives.map((p) => ({ value: p.id, label: p.label }))}
                    onChange={(next) => handleChange("perspectiveId", next)}
                  />
                  <StyleChoiceList
                    label="Complexity Level"
                    value={formData.complexityLevel || ""}
                    options={COMPLEXITY_LEVELS.map((level) => ({ value: level, label: level }))}
                    onChange={(next) => handleChange("complexityLevel", next)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tone Description / AI Instructions</label>
                  <textarea
                    value={formData.toneDescription || ""}
                    onChange={(e) => handleChange("toneDescription", e.target.value)}
                    rows={4}
                    className={
                      styleTextHidden
                        ? `w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 ui-style-text-hidden--${textHideMode}`
                        : "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                    }
                    placeholder="Describe the voice and tone in detail (e.g., 'Friendly but professional, avoiding jargon...')"
                    aria-hidden={styleTextHidden}
                    tabIndex={styleTextHidden ? -1 : undefined}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "visuals" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Color Palette</h3>
                
                <div className="mb-6 p-4 rounded-lg ui-style-panel">
                  <label className="block text-sm font-medium mb-3">Quick Palette Presets</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {COLOR_PALETTES.map((palette) => (
                      <button
                        key={palette.id}
                        onClick={() => handleApplyPalette(palette.id)}
                        className="flex flex-col items-center p-3 border-2 border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-purple-500 transition-colors group"
                      >
                        <div className="flex gap-1 mb-2">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.colors.primary }} />
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.colors.secondary }} />
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.colors.tertiary }} />
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.colors.accent }} />
                        </div>
                        <span className="text-xs font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400">
                          {palette.name}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Click a preset to apply all colors instantly</p>
                </div>

                {/* Individual Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor || "#000000"}
                      onChange={(e) => handleChange("primaryColor", e.target.value)}
                        className="w-16 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor || ""}
                      onChange={(e) => handleChange("primaryColor", e.target.value)}
                        placeholder="#000000"
                        className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                    />
                  </div>
                </div>
                  
                <div>
                  <label className="block text-sm font-medium mb-2">Secondary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                        value={formData.secondaryColor || "#FFFFFF"}
                      onChange={(e) => handleChange("secondaryColor", e.target.value)}
                        className="w-16 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor || ""}
                      onChange={(e) => handleChange("secondaryColor", e.target.value)}
                        placeholder="#FFFFFF"
                        className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                    />
                  </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Tertiary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.tertiaryColor || "#8B5CF6"}
                        onChange={(e) => handleChange("tertiaryColor", e.target.value)}
                        className="w-16 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.tertiaryColor || ""}
                        onChange={(e) => handleChange("tertiaryColor", e.target.value)}
                        placeholder="#8B5CF6"
                        className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Accent Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.accentColor || "#F97316"}
                        onChange={(e) => handleChange("accentColor", e.target.value)}
                        className="w-16 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.accentColor || ""}
                        onChange={(e) => handleChange("accentColor", e.target.value)}
                        placeholder="#F97316"
                        className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Typography</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <BraveMenuSelect
                    label="Heading Font"
                    value={formData.fontHeading || ""}
                    placeholder="Select a heading font"
                    options={HEADING_FONTS.map((font) => ({ value: font, label: font }))}
                    onChange={(next) => handleChange("fontHeading", next)}
                  />
                  <BraveMenuSelect
                    label="Body Font"
                    value={formData.fontBody || ""}
                    placeholder="Select a body font"
                    options={BODY_FONTS.map((font) => ({ value: font, label: font }))}
                    onChange={(next) => handleChange("fontBody", next)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "dictionary" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Custom Dictionary</h3>
              </div>

              <div className="p-4 rounded-lg ui-style-panel">
                <h4 className="text-sm font-medium mb-3">Add New Term</h4>
                
                {/* Row 1: Term and Definition */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="Term (e.g., 'App')"
                    className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm"
                  />
                   <input
                    type="text"
                    value={newDefinition}
                    onChange={(e) => setNewDefinition(e.target.value)}
                    placeholder="Definition (Optional)"
                    className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm"
                  />
                </div>

                {/* Row 2: Category and Term Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <BraveMenuSelect
                    label="Category"
                    value={newCategory}
                    placeholder="Select Category (Optional)"
                    options={DICTIONARY_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                    onChange={setNewCategory}
                  />
                  <BraveMenuSelect
                    label="Term Type"
                    value={newTermType}
                    placeholder="Select Term Type (Optional)"
                    options={TERM_TYPES.map((type) => ({ value: type, label: type }))}
                    onChange={setNewTermType}
                  />
                </div>

                {/* Row 3: Importance and Usage Frequency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <BraveMenuSelect
                    label="Importance"
                    value={newImportance}
                    placeholder="Select Importance (Optional)"
                    options={IMPORTANCE_LEVELS.map((level) => ({ value: level, label: level }))}
                    onChange={setNewImportance}
                  />
                  <BraveMenuSelect
                    label="Usage Frequency"
                    value={newUsageFrequency}
                    placeholder="Select Usage Frequency (Optional)"
                    options={USAGE_FREQUENCIES.map((freq) => ({ value: freq, label: freq }))}
                    onChange={setNewUsageFrequency}
                  />
                </div>

                {/* Row 4: Usage Rule */}
                <div className="mb-3">
                   <input
                    type="text"
                    value={newUsage}
                    onChange={(e) => setNewUsage(e.target.value)}
                    placeholder="Usage Rule (e.g., 'Capitalize', 'Use sparingly')"
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm"
                  />
                </div>

                <button
                  onClick={handleAddTerm}
                  disabled={!newTerm || isSaving}
                  className="text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black px-3 py-1.5 rounded-md font-medium disabled:opacity-50"
                >
                  Add Term
                </button>
              </div>

              <div className="space-y-2">
                {dictionary.map((entry) => (
                  <div key={entry.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
                    {editingEntryId === entry.id ? (
                      // EDIT MODE
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editFormData.term}
                            onChange={(e) => setEditFormData({...editFormData, term: e.target.value})}
                            placeholder="Term"
                            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            value={editFormData.definition}
                            onChange={(e) => setEditFormData({...editFormData, definition: e.target.value})}
                            placeholder="Definition"
                            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <BraveMenuSelect
                            label="Category"
                            value={editFormData.category}
                            placeholder="Select Category"
                            options={DICTIONARY_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                            onChange={(next) => setEditFormData({ ...editFormData, category: next })}
                          />
                          <BraveMenuSelect
                            label="Term Type"
                            value={editFormData.termType}
                            placeholder="Select Term Type"
                            options={TERM_TYPES.map((type) => ({ value: type, label: type }))}
                            onChange={(next) => setEditFormData({ ...editFormData, termType: next })}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <BraveMenuSelect
                            label="Importance"
                            value={editFormData.importance}
                            placeholder="Select Importance"
                            options={IMPORTANCE_LEVELS.map((level) => ({ value: level, label: level }))}
                            onChange={(next) => setEditFormData({ ...editFormData, importance: next })}
                          />
                          <BraveMenuSelect
                            label="Usage Frequency"
                            value={editFormData.usageFrequency}
                            placeholder="Select Usage Frequency"
                            options={USAGE_FREQUENCIES.map((freq) => ({ value: freq, label: freq }))}
                            onChange={(next) => setEditFormData({ ...editFormData, usageFrequency: next })}
                          />
                        </div>
                        
                        <input
                          type="text"
                          value={editFormData.usageGuidelines}
                          onChange={(e) => setEditFormData({...editFormData, usageGuidelines: e.target.value})}
                          placeholder="Usage Rule"
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm"
                        />
                        
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="text-sm bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-sm bg-zinc-500 text-white px-4 py-2 rounded-md hover:bg-zinc-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // VIEW MODE - Make it clickable
                      <div 
                        className="flex items-start justify-between p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                        onClick={() => handleEditEntry(entry)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{entry.term}</p>
                            {entry.category && (
                              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                {entry.category}
                              </span>
                            )}
                            {entry.termType && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                {entry.termType}
                              </span>
                            )}
                          </div>
                          {entry.definition && <p className="text-xs text-zinc-500 mb-1">{entry.definition}</p>}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {entry.importance && (
                              <span className="text-orange-600 dark:text-orange-400">
                                ⭐ {entry.importance}
                              </span>
                            )}
                            {entry.usageFrequency && (
                              <span className="text-green-600 dark:text-green-400">
                                📊 {entry.usageFrequency}
                              </span>
                            )}
                          </div>
                          {entry.usageGuidelines && (
                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                              Rule: {entry.usageGuidelines}
                            </p>
                          )}
                    </div>
                    <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering edit when clicking delete
                            handleDeleteTerm(entry.id);
                          }}
                      className="text-zinc-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                      </div>
                    )}
                  </div>
                ))}
                {dictionary.length === 0 && (
                  <p className="text-center text-zinc-500 text-sm py-4">No dictionary entries yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "ai-import" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">AI-Powered Style Import</h3>
                <p className="text-sm text-zinc-500">
                  Analyze documents, URLs, or text samples to automatically extract style characteristics.
                </p>
              </div>

              {/* Method Selector */}
              <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setAiAnalysisMethod("upload")}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    aiAnalysisMethod === "upload"
                      ? "border-purple-600 text-purple-600 font-medium"
                      : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Document
                </button>
                <button
                  onClick={() => setAiAnalysisMethod("url")}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    aiAnalysisMethod === "url"
                      ? "border-purple-600 text-purple-600 font-medium"
                      : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  From URL
                </button>
                <button
                  onClick={() => setAiAnalysisMethod("text")}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    aiAnalysisMethod === "text"
                      ? "border-purple-600 text-purple-600 font-medium"
                      : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Paste Text
                </button>
              </div>

              {/* Upload Method */}
              {aiAnalysisMethod === "upload" && (
                <div>
                  <label className="block">
                    <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center hover:border-purple-600 transition-colors cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                      <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-zinc-500">PDF, DOCX, or TXT (max 10MB)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isAnalyzing}
                      />
                    </div>
                  </label>
                </div>
              )}

              {/* URL Method */}
              {aiAnalysisMethod === "url" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Website URL</label>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                      disabled={isAnalyzing}
                    />
                  </div>
                  <button
                    onClick={handleUrlAnalyze}
                    disabled={isAnalyzing || !urlInput.trim()}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Analyze URL
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Text Method */}
              {aiAnalysisMethod === "text" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Text Sample</label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste a writing sample here (minimum 100 characters)..."
                      rows={8}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 font-mono text-sm"
                      disabled={isAnalyzing}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      {textInput.length} characters
                    </p>
                  </div>
                  <button
                    onClick={handleTextAnalyze}
                    disabled={isAnalyzing || textInput.trim().length < 100}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Analyze Text
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Progress Display */}
              {isAnalyzing && analysisProgress && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-200">Analyzing Content</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{analysisProgress}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">This may take 10-30 seconds depending on content size...</p>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {analysisError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-200">Analysis Failed</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{analysisError}</p>
                  </div>
                </div>
              )}

              {/* Results Review Panel */}
              {analysisResult && (
                <div className="border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
                  <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-3 border-b border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                        Analysis Complete
                      </h4>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {/* Style Settings */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Tone</label>
                        <p className="text-sm font-medium">
                          {tones.find(t => t.id === analysisResult.toneId)?.label || analysisResult.toneId}
                        </p>
                        <div className="mt-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded">
                          <div 
                            className="h-full bg-purple-600 rounded" 
                            style={{ width: `${analysisResult.confidence.tone * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Writing Style</label>
                        <p className="text-sm font-medium">
                          {writingStyles.find(s => s.id === analysisResult.writingStyleId)?.label || analysisResult.writingStyleId}
                        </p>
                        <div className="mt-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded">
                          <div 
                            className="h-full bg-purple-600 rounded" 
                            style={{ width: `${analysisResult.confidence.style * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Perspective</label>
                        <p className="text-sm font-medium">
                          {perspectives.find(p => p.id === analysisResult.perspectiveId)?.label || analysisResult.perspectiveId}
                        </p>
                        <div className="mt-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded">
                          <div 
                            className="h-full bg-purple-600 rounded" 
                            style={{ width: `${analysisResult.confidence.perspective * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Complexity Level</label>
                        <p className="text-sm font-medium">{analysisResult.complexityLevel}</p>
                      </div>
                    </div>

                    {/* Tone Description */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">AI Description</label>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded">
                        {analysisResult.toneDescription}
                      </p>
                    </div>

                    {/* Suggested Terms */}
                    {analysisResult.suggestedTerms.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-2">
                          Suggested Dictionary Terms ({analysisResult.suggestedTerms.length})
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {analysisResult.suggestedTerms.map((term, idx) => (
                            <div key={idx} className="text-sm bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
                              <p className="font-medium">{term.term}</p>
                              {term.definition && (
                                <p className="text-xs text-zinc-500 mt-0.5">{term.definition}</p>
                              )}
                              {term.usageGuidelines && (
                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                                  {term.usageGuidelines}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => applyAnalysisResults(false)}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                      >
                        Apply All
                      </button>
                      <button
                        onClick={() => applyAnalysisResults(true)}
                        className="flex-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                      >
                        Apply Settings Only
                      </button>
                      <button
                        onClick={() => {
                          setAnalysisResult(null);
                          setAnalysisError(null);
                        }}
                        className="px-4 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


