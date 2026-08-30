"use client";

import { useState } from "react";
import { StoryCategory, StoryType } from "@/lib/data/storyTypes";
import { CategorySelection } from "./category-selection";
import { TypeSelection } from "./type-selection";
import { TypeDetailModal } from "./type-detail-modal";
import CreateStoryForm from "./create-story-form";
import { createStoryAction } from "./actions";
import { ModeSelection, StoryMode } from "./mode-selection";
import { ModeQuestionnaire } from "./mode-questionnaire";
import { MoralConflictSelection } from "./moral-conflict/conflict-selection";
import { ComplexitySelection } from "./moral-conflict/complexity-selection";
import { PositionDefinition } from "./moral-conflict/position-definition";
import { MoralConflictID, MoralComplexity } from "@/lib/data/moralConflicts";
import { ArchetypeGrid } from "./archetype/archetype-grid";
import { AIArchetypeSuggestion } from "./archetype/ai-suggestion";
import { CombinationSelector } from "./archetype/combination-selector";
import { DarkSidesExplorer } from "./archetype/dark-sides-explorer";
import { JourneyMapper } from "./archetype/journey-mapper";
import { ChevronRight } from "lucide-react";
import { archetypesLibrary } from "@/lib/data/archetypes";
import { InferSelectModel } from "drizzle-orm";
import { styleGuides } from "@/lib/db/schema";

type Step = 
  | "mode" 
  | "category" 
  | "type" 
  | "archetype-selection" 
  | "archetype-combination" 
  | "archetype-flaws" 
  | "archetype-journey"
  | "moral-conflict" 
  | "moral-complexity" 
  | "moral-position" 
  | "details";

interface CreateStoryWizardProps {
  styleGuides?: InferSelectModel<typeof styleGuides>[];
}

export default function CreateStoryWizard({ styleGuides = [] }: CreateStoryWizardProps) {
  const [step, setStep] = useState<Step>("mode");
  const [selectedMode, setSelectedMode] = useState<StoryMode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<StoryCategory | null>(null);
  const [selectedType, setSelectedType] = useState<StoryType | null>(null);
  const [viewingType, setViewingType] = useState<StoryType | null>(null);
  const [showModeHelp, setShowModeHelp] = useState(false);

  // Archetype State
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [showArchetypeGrid, setShowArchetypeGrid] = useState(true);
  const [archetypeSecondary, setArchetypeSecondary] = useState<string | null>(null);
  const [archetypeDarkSides, setArchetypeDarkSides] = useState<{ tooMuch: boolean; tooLittle: boolean }>({ tooMuch: false, tooLittle: false });
  const [archetypeJourney, setArchetypeJourney] = useState<{ start: string; middle: string; end: string }>({ start: "", middle: "", end: "" });

  // Moral Framework State
  const [selectedConflict, setSelectedConflict] = useState<MoralConflictID | null>(null);
  const [selectedComplexity, setSelectedComplexity] = useState<MoralComplexity | null>(null);
  const [moralPositions, setMoralPositions] = useState<any>(null);

  const handleModeSelect = (mode: StoryMode) => {
    setSelectedMode(mode);
    setStep("category");
  };

  const handleCategorySelect = (category: StoryCategory) => {
    setSelectedCategory(category);
    if (category === "custom") {
      alert("Custom story type flow coming soon! Please select a category.");
      return;
    }
    setStep("type");
  };

  const handleTypeSelect = (type: StoryType) => {
    setViewingType(type);
  };

  const handleTypeConfirm = (type: StoryType) => {
    setSelectedType(type);
    setViewingType(null);
    setStep("archetype-selection");
  };

  // Archetype Handlers
  const handleArchetypeSelect = (id: string) => {
    setSelectedArchetype(id);
    if (selectedMode === "comprehensive") {
      setStep("archetype-combination");
    } else {
      setStep("details");
    }
  };

  const handleCombinationNext = () => {
    setStep("archetype-flaws");
  };

  const handleFlawsNext = () => {
    setStep("archetype-journey");
  };

  const handleJourneyNext = () => {
    setStep("moral-conflict");
  };

  const handleDarkSidesChange = (darkSides: { tooMuch: boolean; tooLittle: boolean }) => {
    setArchetypeDarkSides(darkSides);
  };

  const handleJourneyChange = (journey: { start: string; middle: string; end: string }) => {
    setArchetypeJourney(journey);
  };

  // Navigation Handlers
  const handleBackToMode = () => { setStep("mode"); setSelectedMode(null); };
  const handleBackToCategories = () => { setStep("category"); setSelectedCategory(null); };
  const handleBackToTypes = () => { setStep("type"); setSelectedType(null); };
  
  // Archetype Back Handlers
  const handleBackToType = () => { setStep("type"); setSelectedType(null); };
  const handleBackToArchetypeSelection = () => { setStep("archetype-selection"); };
  const handleBackToCombination = () => { setStep("archetype-combination"); };
  const handleBackToFlaws = () => { setStep("archetype-flaws"); };
  
  // Moral Framework Handlers
  const handleBackToJourney = () => { setStep("archetype-journey"); }; // Or selection if quick mode?
  const handleBackToConflict = () => { setStep("moral-conflict"); setSelectedComplexity(null); };
  const handleBackToComplexity = () => { setStep("moral-complexity"); setMoralPositions(null); };

  const handleConflictSelect = (id: MoralConflictID) => {
    setSelectedConflict(id);
  };

  const handleConflictNext = () => {
    if (selectedConflict) {
      setStep("moral-complexity");
    } else {
    setStep("details");
    }
  };

  const handleComplexitySelect = (complexity: MoralComplexity) => {
    setSelectedComplexity(complexity);
  };

  const handleComplexityNext = () => {
    setStep("moral-position");
  };

  const handlePositionComplete = (data: any) => {
    setMoralPositions(data);
    setStep("details");
  };

  return (
    <>
      {step === "mode" && (
        <div>
           <h2 className="text-xl font-semibold text-brand-ink dark:text-brand-yellow mb-6">
            Choose your storytelling mode
          </h2>
          <ModeSelection 
            onSelect={handleModeSelect} 
            onHelp={() => setShowModeHelp(true)}
          />
          <ModeQuestionnaire 
            isOpen={showModeHelp}
            onClose={() => setShowModeHelp(false)}
            onComplete={(mode) => {
              setShowModeHelp(false);
              handleModeSelect(mode);
            }}
          />
        </div>
      )}

      {step === "category" && (
        <div>
           <div className="flex items-center gap-4 mb-6">
            <button onClick={handleBackToMode} className="text-sm text-brand-ink/60 dark:text-brand-seafoam hover:text-brand-teal dark:hover:text-brand-yellow">
              ← Back to Mode
            </button>
            <h2 className="text-xl font-semibold text-brand-ink dark:text-brand-yellow">
            What kind of story do you want to tell?
          </h2>
          </div>
          <CategorySelection onSelect={handleCategorySelect} />
        </div>
      )}

      {step === "type" && selectedCategory && (
        <TypeSelection 
          category={selectedCategory} 
          onSelect={handleTypeSelect} 
          onBack={handleBackToCategories} 
        />
      )}

      {/* Archetype Selection */}
      {step === "archetype-selection" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={handleBackToType} className="text-sm text-brand-ink/60 dark:text-brand-seafoam hover:text-brand-teal dark:hover:text-brand-yellow">
              ← Back to Story Type
            </button>
            <h2 className="text-xl font-semibold text-brand-ink dark:text-brand-yellow">
              Choose your Character Archetype
            </h2>
          </div>
          
          {!showArchetypeGrid && selectedType ? (
            <AIArchetypeSuggestion
              context={{
                title: "New Story",
                description: "",
                storyType: selectedType.name,
              }}
              onSelect={handleArchetypeSelect}
              onBrowseGrid={() => setShowArchetypeGrid(true)}
            />
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setShowArchetypeGrid(false)}
                className="text-sm text-brand-teal dark:text-brand-yellow hover:underline"
              >
                ✨ Get an AI suggestion
              </button>
              <ArchetypeGrid
                onSelect={handleArchetypeSelect}
                selectedId={selectedArchetype}
              />
            </div>
          )}
        </div>
      )}

      {/* Archetype Advanced Steps (Comprehensive) */}
      {step === "archetype-combination" && selectedArchetype && (
        <div className="space-y-6">
           <div className="flex items-center justify-between mb-6">
            <button onClick={handleBackToArchetypeSelection} className="text-sm text-brand-ink/60 dark:text-brand-seafoam hover:text-brand-teal dark:hover:text-brand-yellow">
              ← Back to Archetype
            </button>
            <button 
              onClick={handleCombinationNext}
              className="flex items-center gap-2 px-4 py-2 bg-brand-ink dark:bg-brand-yellow text-white dark:text-brand-ink rounded-lg text-sm font-medium hover:bg-brand-teal dark:hover:bg-brand-seafoam"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <CombinationSelector 
            primaryArchetypeId={selectedArchetype}
            selectedSecondaryId={archetypeSecondary}
            onSelect={(id) => setArchetypeSecondary(id)}
          />
        </div>
      )}

      {step === "archetype-flaws" && selectedArchetype && (
        <div className="space-y-6">
           <div className="flex items-center justify-between mb-6">
            <button onClick={handleBackToCombination} className="text-sm text-brand-ink/60 dark:text-brand-seafoam hover:text-brand-teal dark:hover:text-brand-yellow">
              ← Back to Combination
            </button>
            <button 
              onClick={handleFlawsNext}
              className="flex items-center gap-2 px-4 py-2 bg-brand-ink dark:bg-brand-yellow text-white dark:text-brand-ink rounded-lg text-sm font-medium hover:bg-brand-teal dark:hover:bg-brand-seafoam"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <DarkSidesExplorer 
            archetype={archetypesLibrary[selectedArchetype]}
            onChange={handleDarkSidesChange}
            initialState={archetypeDarkSides}
          />
        </div>
      )}

      {step === "archetype-journey" && selectedArchetype && (
        <div className="space-y-6">
           <div className="flex items-center justify-between mb-6">
            <button onClick={handleBackToFlaws} className="text-sm text-brand-ink/60 dark:text-brand-seafoam hover:text-brand-teal dark:hover:text-brand-yellow">
              ← Back to Flaws
            </button>
            <button 
              onClick={handleJourneyNext}
              className="flex items-center gap-2 px-4 py-2 bg-brand-ink dark:bg-brand-yellow text-white dark:text-brand-ink rounded-lg text-sm font-medium hover:bg-brand-teal dark:hover:bg-brand-seafoam"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <JourneyMapper 
            archetype={archetypesLibrary[selectedArchetype]}
            onChange={handleJourneyChange}
            initialJourney={archetypeJourney}
          />
        </div>
      )}

      {/* Moral Framework Steps (Comprehensive Mode Only) */}
      {step === "moral-conflict" && (
        <MoralConflictSelection
          selectedId={selectedConflict}
          onSelect={handleConflictSelect}
          onNext={handleConflictNext}
          onBack={selectedMode === "comprehensive" ? handleBackToJourney : handleBackToArchetypeSelection}
        />
      )}

      {step === "moral-complexity" && (
        <ComplexitySelection
          selectedComplexity={selectedComplexity}
          onSelect={handleComplexitySelect}
          onNext={handleComplexityNext}
          onBack={handleBackToConflict} 
        />
      )}

      {step === "moral-position" && selectedComplexity && selectedConflict && (
        <PositionDefinition
          complexity={selectedComplexity}
          conflictName={selectedConflict}
          onComplete={handlePositionComplete}
          onBack={handleBackToComplexity}
        />
      )}

      {step === "details" && selectedCategory && selectedType && selectedMode && (
        <CreateStoryForm 
          createStoryAction={createStoryAction} 
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          selectedMode={selectedMode}
          // Pass moral data
          moralData={selectedConflict ? {
            primary: selectedConflict,
            complexity: selectedComplexity,
            positions: moralPositions
          } : undefined}
          // Pass archetype data
          archetypeData={selectedArchetype ? {
            primary: selectedArchetype,
            secondary: archetypeSecondary,
            darkSides: archetypeDarkSides,
            journey: archetypeJourney
          } : undefined}
          styleGuides={styleGuides}
          onBack={() => {
            if (selectedMode === "comprehensive" && selectedConflict) {
              setStep("moral-position");
            } else if (selectedMode === "comprehensive") {
              // If they skipped conflict selection but did archetype
              setStep("moral-conflict");
            } else {
              setStep("archetype-selection");
            }
          }}
        />
      )}

      <TypeDetailModal 
        type={viewingType} 
        isOpen={!!viewingType} 
        onClose={() => setViewingType(null)} 
        onConfirm={handleTypeConfirm} 
      />
    </>
  );
}
