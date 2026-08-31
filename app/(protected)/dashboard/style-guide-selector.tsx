"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, Plus, Palette } from "lucide-react";
import { InferSelectModel } from "drizzle-orm";
import { styleGuides } from "@/lib/db/schema";
import { useRouter } from "next/navigation";

interface StyleGuideSelectorProps {
  styleGuides: InferSelectModel<typeof styleGuides>[];
}

export function StyleGuideSelector({ styleGuides }: StyleGuideSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (guideId: string) => {
    // Navigate to create story with this style guide pre-selected
    // For now, we'll just go to the style guide edit page or maybe create story?
    // The requirement says "offered the choice of existing style guides". 
    // Usually this implies selecting one to *use* or *edit*.
    // Let's assume selecting one takes you to its details page for now, 
    // or maybe the create story wizard with a query param?
    // Given the context of "below New Story", it likely implies "Start with this guide".
    
    // Let's link to the style guide detail for now as a safe default for "choosing" it,
    // or pass it as a param to create-story if supported.
    // Since create-story doesn't support query params for guide yet in the code we saw,
    // let's just navigate to the guide detail/edit page.
    router.push(`/style-guide/${guideId}`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-teal px-4 py-2.5 text-sm font-medium text-brand-cream dark:bg-brand-seafoam dark:!text-brand-ink hover:bg-brand-ink transition-colors shadow-sm whitespace-nowrap dark:hover:bg-brand-yellow"
      >
        <Palette className="h-4 w-4" />
        Choose Style Guide
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-brand-ink shadow-lg ring-1 ring-brand-seafoam/40 focus:outline-none z-50 border border-brand-seafoam/40 dark:border-brand-seafoam/30">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-brand-ink/60 dark:text-brand-seafoam uppercase tracking-wider">
              Select Guide
            </div>
            
            {styleGuides.length > 0 ? (
              styleGuides.map((guide) => (
                <button
                  key={guide.id}
                  onClick={() => handleSelect(guide.id)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-brand-ink dark:text-brand-seafoam hover:bg-brand-cream dark:hover:bg-brand-seafoam/10 text-left"
                >
                  <BookOpen className="h-4 w-4 text-brand-teal" />
                  <span className="truncate">{guide.name}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-brand-ink/60 dark:text-brand-seafoam italic">No guides found</div>
            )}

            <div className="border-t border-brand-seafoam/30 my-1"></div>

            <Link
              href="/style-guide"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-brand-orange dark:text-brand-yellow hover:bg-brand-cream dark:hover:bg-brand-seafoam/10"
              onClick={() => setIsOpen(false)}
            >
              <Plus className="h-4 w-4" />
              Create New Guide
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
