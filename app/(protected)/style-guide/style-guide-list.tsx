"use client";

import { useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { Copy, Trash2, Edit2 } from "lucide-react";
import { deleteStyleGuide, duplicateStyleGuide } from "./actions";
import { InferSelectModel } from "drizzle-orm";
import { styleGuides } from "@/lib/db/schema";

type StyleGuide = InferSelectModel<typeof styleGuides>;

interface StyleGuideListProps {
  initialGuides: StyleGuide[];
}

export function StyleGuideList({ initialGuides }: StyleGuideListProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {initialGuides.map((guide) => (
        <StyleGuideCard key={guide.id} guide={guide} />
      ))}
      {initialGuides.length === 0 && (
        <div className="col-span-full py-12 text-center rounded-xl border-2 border-dashed ui-style-panel" style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef", backgroundColor: "#1d2e3f", borderColor: "#faf7ef" }}>
          No style guides yet. Create one to get started!
        </div>
      )}
    </div>
  );
}

function StyleGuideCard({ guide }: { guide: StyleGuide }) {
  const [isPending, startTransition] = useTransition();
  const displayName = guide.title || guide.name || "Untitled Style Guide";

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this style guide?")) {
      startTransition(async () => {
        await deleteStyleGuide(guide.id);
      });
    }
  };

  const handleDuplicate = () => {
    startTransition(async () => {
      await duplicateStyleGuide(guide.id);
    });
  };

  return (
    <div
      className="group relative rounded-xl p-6 ui-style-panel transition-opacity hover:opacity-95"
      style={{ backgroundColor: "#1d2e3f", color: "#faf7ef", WebkitTextFillColor: "#faf7ef", border: "1px solid #faf7ef" }}
    >
      <Link
        href={`/style-guide/${guide.id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`Open ${displayName}`}
      />
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0 pr-2">
          <h3 className="font-semibold text-lg mb-1 group-hover:underline">{displayName}</h3>
          <p className="text-xs" style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}>
            {guide.clientOrBrandName ? `${guide.clientOrBrandName} · ` : ""}
            <UpdatedAtLabel value={guide.updatedAt} />
          </p>
          {guide.status ? (
            <p className="mt-1 text-xs capitalize opacity-80">
              {guide.status}
              {guide.isPublic ? " · shared" : ""}
            </p>
          ) : null}
          {guide.isPublic && guide.shareToken ? (
            <Link
              href={`/g/${guide.shareToken}`}
              target="_blank"
              rel="noreferrer"
              className="relative z-10 mt-1 inline-block text-xs underline opacity-80"
              onClick={(event) => event.stopPropagation()}
            >
              Open view-only link
            </Link>
          ) : null}
        </div>
        <div className="relative z-10 flex gap-1">
           <button
             type="button"
             onClick={handleDuplicate}
             disabled={isPending}
             className="p-2 transition-colors"
             style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}
             title="Duplicate"
           >
             <Copy className="w-4 h-4" />
           </button>
           <button
             type="button"
             onClick={handleDelete}
             disabled={isPending}
             className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
             title="Delete"
           >
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-20" style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}>Tone:</span>
          <span className="font-medium capitalize">{guide.toneId?.replace('_', ' ') || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-20" style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}>Complexity:</span>
          <span className="font-medium">{guide.complexityLevel || "—"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex gap-2 mr-auto">
          {guide.primaryColor && (
            <div 
              className="w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700" 
              style={{ backgroundColor: guide.primaryColor }}
            />
          )}
          {guide.secondaryColor && (
            <div 
              className="w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700" 
              style={{ backgroundColor: guide.secondaryColor }}
            />
          )}
        </div>
        
        <span
          className="relative z-10 text-sm font-medium flex items-center gap-1"
          style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}
        >
          Edit Guide <Edit2 className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

function subscribe() {
  return () => {};
}

function toIso(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function UpdatedAtLabel({ value }: { value: Date | string }) {
  const iso = toIso(value);
  const label = useSyncExternalStore(
    subscribe,
    () => new Date(iso).toLocaleDateString(),
    () => new Date(iso).toISOString().slice(0, 10),
  );

  return <time dateTime={iso}>Updated {label}</time>;
}
