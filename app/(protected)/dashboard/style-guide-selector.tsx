"use client";

import { useState, useRef, useEffect } from "react";
import { brandSecondaryButtonClassName, brandSecondaryButtonStyle, brandSurfaceCardClassName } from "@/lib/ui/button-classes";
import Link from "next/link";
import { BookOpen, ChevronDown, Plus, Palette } from "lucide-react";
import { InferSelectModel } from "drizzle-orm";
import { styleGuides } from "@/lib/db/schema";
import { useRouter } from "next/navigation";

interface StyleGuideSelectorProps {
  styleGuides: InferSelectModel<typeof styleGuides>[];
}

function formatUpdatedAt(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
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
    router.push(`/style-guide/${guideId}`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${brandSecondaryButtonClassName} w-full shadow-sm whitespace-nowrap`}
        style={brandSecondaryButtonStyle}
      >
        <Palette className="h-4 w-4" />
        Choose Style Guide
        {styleGuides.length > 0 ? (
          <span className="rounded-full bg-brand-ink/10 px-1.5 py-0.5 text-xs font-semibold">
            {styleGuides.length}
          </span>
        ) : null}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-72 origin-top-right ${brandSurfaceCardClassName} shadow-lg ring-1 ring-brand-seafoam/40 focus:outline-none z-50`}>
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-brand-ink/60 uppercase tracking-wider">
              Select Guide
            </div>

            {styleGuides.length > 0 ? (
              <div className="max-h-72 overflow-y-auto">
                {styleGuides.map((guide) => (
                  <button
                    key={guide.id}
                    onClick={() => handleSelect(guide.id)}
                    className="flex w-full items-start gap-2 px-4 py-2 text-sm text-brand-ink hover:bg-brand-cream text-left"
                  >
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" />
                    <span className="min-w-0 flex flex-col">
                      <span className="truncate font-medium">{guide.name}</span>
                      <span className="truncate text-xs text-brand-ink/60">
                        {guide.toneId?.replace("_", " ") || "No tone"}
                        {guide.updatedAt ? ` · ${formatUpdatedAt(guide.updatedAt)}` : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-2 text-sm text-brand-ink/60 italic">No guides found</div>
            )}

            <div className="border-t border-brand-seafoam/30 my-1"></div>

            <Link
              href="/style-guide"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-brand-ink hover:bg-brand-cream"
              onClick={() => setIsOpen(false)}
            >
              <BookOpen className="h-4 w-4" />
              View all style guides
            </Link>

            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-brand-orange hover:bg-brand-cream text-left"
              onClick={() => {
                setIsOpen(false);
                router.push("/style-guide");
              }}
            >
              <Plus className="h-4 w-4" />
              Manage style guides
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
