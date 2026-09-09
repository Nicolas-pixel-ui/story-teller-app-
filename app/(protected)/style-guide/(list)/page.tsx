import { Suspense } from "react";
import { selfReferencingCanonical } from "@/lib/seo/site-metadata";
import { getStyleGuides } from "../actions";
import { StyleGuideList } from "../style-guide-list";
import { CreateGuideButton } from "../create-guide-button";

export const metadata = selfReferencingCanonical("/style-guide");

export default async function StyleGuidePage() {
  const guides = await getStyleGuides();
  const styleGuideCount = guides.length;

  return (
    <div className="ui-style-shell min-h-screen relative overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight mb-2"
              style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}
            >
              Style Guides
              <span className="ml-3 inline-flex min-w-8 items-center justify-center rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 align-middle text-lg font-bold tabular-nums">
                {styleGuideCount}
              </span>
            </h1>
            <p
              className="text-sm"
              style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}
            >
              {styleGuideCount === 1
                ? "You have made 1 style guide. Manage your brand voice, tone, and visual identity across all stories."
                : `You have made ${styleGuideCount} style guides. Manage your brand voice, tone, and visual identity across all stories.`}
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
