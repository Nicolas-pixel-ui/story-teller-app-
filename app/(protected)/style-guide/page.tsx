import { Suspense } from "react";
import { selfReferencingCanonical } from "@/lib/seo/site-metadata";
import { getStyleGuides } from "./actions";
import { StyleGuideList } from "./style-guide-list";
import { CreateGuideButton } from "./create-guide-button";

export const metadata = selfReferencingCanonical("/style-guide");

export default async function StyleGuidePage() {
  const guides = await getStyleGuides();

  return (
    <div className="ui-style-shell min-h-screen relative overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}
              >
                Style Guides
              </h1>
              <span
                className="inline-flex min-w-8 items-center justify-center rounded-full border px-2.5 py-0.5 text-sm font-bold tabular-nums"
                style={{
                  borderColor: "rgba(250, 247, 239, 0.35)",
                  color: "#faf7ef",
                  WebkitTextFillColor: "#faf7ef",
                }}
              >
                {guides.length}
              </span>
            </div>
            <p
              className="text-sm"
              style={{ color: "#faf7ef", WebkitTextFillColor: "#faf7ef" }}
            >
              {guides.length === 1
                ? "You have made 1 style guide"
                : `You have made ${guides.length} style guides`}
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


