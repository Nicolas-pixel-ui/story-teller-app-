import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { selfReferencingCanonical } from "@/lib/seo/site-metadata";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import StructureSelectorScreen from "./_components/StructureSelectorScreen";

export const maxDuration = 60;

async function getStory(storyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, user.id)))
    .limit(1);

  return story || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string }>;
}): Promise<Metadata> {
  const { storyId } = await params;
  return selfReferencingCanonical(`/stories/${storyId}/structure`);
}

export default async function StructurePage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const story = await getStory(storyId);

  if (!story) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link
            href={`/stories/${storyId}`}
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 flex items-center gap-1"
          >
            ← Back to Story
          </Link>
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{story.title}</div>
          <div className="w-20"></div> {/* Spacer for center alignment */}
        </div>
      </div>
      
      <StructureSelectorScreen storyId={story.id} story={story} />
    </div>
  );
}









