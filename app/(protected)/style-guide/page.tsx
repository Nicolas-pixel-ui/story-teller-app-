import { Suspense } from "react";
import { selfReferencingCanonical } from "@/lib/seo/site-metadata";
import { getStyleGuides } from "./actions";
import { StyleGuideList } from "./style-guide-list";
import { CreateGuideButton } from "./create-guide-button";

export const metadata = selfReferencingCanonical("/style-guide");

export default async function StyleGuidePage() {
  const guides = await getStyleGuides();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 relative overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Style Guides</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Manage your brand voice, tone, and visual identity across all stories.
            </p>
          </div>
          <CreateGuideButton />
        </div>

        <Suspense fallback={<div>Loading style guides...</div>}>
          <StyleGuideList initialGuides={guides} />
        </Suspense>
      </div>
    </div>
  );
}


