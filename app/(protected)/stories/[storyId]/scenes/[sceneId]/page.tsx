import type { Metadata } from "next";
import { selfReferencingCanonical } from "@/lib/seo/site-metadata";
import { db } from "@/lib/db";
import { scenes } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import SceneEditor from "./scene-editor";

export const maxDuration = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string; sceneId: string }>;
}): Promise<Metadata> {
  const { storyId, sceneId } = await params;
  return selfReferencingCanonical(`/stories/${storyId}/scenes/${sceneId}`);
}

export default async function SceneEditorPage({
  params,
}: {
  params: Promise<{ storyId: string; sceneId: string }>;
}) {
  const { storyId, sceneId } = await params;

  try {
    const [scene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, sceneId))
      .limit(1);

    if (!scene) {
      notFound();
    }

    const storyScenes = await db
      .select({
        id: scenes.id,
        title: scenes.title,
        order: scenes.order,
      })
      .from(scenes)
      .where(eq(scenes.storyId, storyId))
      .orderBy(asc(scenes.order));

    return <SceneEditor scene={scene} storyId={storyId} allScenes={storyScenes} />;
  } catch (error) {
    console.error("[SCENE_EDITOR_PAGE] Failed to load scene:", error);
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-brand-ink dark:text-brand-yellow">
            Could not load this scene
          </h1>
          <p className="text-sm text-brand-ink/80 dark:text-brand-seafoam">
            Please try again in a moment. If you were generating a draft, your answers are still saved.
          </p>
          <Link
            href={`/stories/${storyId}/scenes`}
            className="inline-flex rounded-md bg-brand-ink px-4 py-2 text-sm font-medium text-white dark:bg-brand-yellow dark:text-brand-ink"
          >
            Back to scenes
          </Link>
        </div>
      </div>
    );
  }
}









