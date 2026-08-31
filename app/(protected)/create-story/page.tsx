import Link from "next/link";
import CreateStoryWizard from "./wizard";
import { getStyleGuides } from "../style-guide/actions";
import { selfReferencingCanonical } from "@/lib/seo/site-metadata";

export const metadata = selfReferencingCanonical("/create-story");
export const maxDuration = 30;

export default async function CreateStoryPage() {
  const styleGuides = await getStyleGuides().catch(() => []); // Handle error gracefully

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-ink">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-brand-ink/85 dark:text-brand-seafoam hover:text-brand-teal dark:hover:text-brand-yellow"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="rounded-lg border border-brand-seafoam/30 bg-white dark:bg-brand-ink/80 p-8 shadow-lg">
          <CreateStoryWizard styleGuides={styleGuides} />
        </div>
      </div>
    </div>
  );
}
