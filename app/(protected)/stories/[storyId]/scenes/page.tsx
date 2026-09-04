import type { Metadata } from "next";
import { selfReferencingCanonical } from "@/lib/seo/site-metadata";
import { getScenes, createScene } from "./actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const maxDuration = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string }>;
}): Promise<Metadata> {
  const { storyId } = await params;
  return selfReferencingCanonical(`/stories/${storyId}/scenes`);
}

export default async function ScenesPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const scenes = await getScenes(storyId);

  async function handleCreateScene() {
    "use server";
    const newScene = await createScene(storyId);
    redirect(`/stories/${storyId}/scenes/${newScene.id}`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link
              href={`/stories/${storyId}`}
              className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 mb-2 block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Scene Development
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Build your story scene by scene using the Movie Time framework. Add as many scenes as you need—there is no limit.
            </p>
          </div>
          <form action={handleCreateScene}>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
            >
              <span>+</span> Add Scene
            </button>
          </form>
        </div>

        <div className="grid gap-4">
          {scenes.map((scene) => (
            <Link
              key={scene.id}
              href={`/stories/${storyId}/scenes/${scene.id}`}
              className="block group"
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-1 rounded font-mono">
                        Scene {scene.order}
                      </span>
                      <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {scene.title}
                      </h3>
                    </div>
                    {/* Preview of content if available, or placeholder */}
                    <p className="text-zinc-500 dark:text-zinc-500 text-sm line-clamp-2">
                        {/* Accessing generic JSON field requires casting or helper in TS, keeping it simple for now */}
                        {(scene.movieTimeAction as any)?.what || "No description yet..."}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className={`text-xs px-2 py-1 rounded-full border ${
                        scene.completenessStatus === 'complete' ? 'bg-green-50 text-green-700 border-green-200' :
                        scene.completenessStatus === 'drafted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        scene.completenessStatus === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-zinc-100 text-zinc-500 border-zinc-200'
                     }`}>
                        {scene.completenessStatus === 'in_progress' ? 'In Progress' :
                         scene.completenessStatus === 'drafted' ? 'Drafted' :
                         scene.completenessStatus === 'complete' ? 'Complete' : 'Empty'}
                     </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {scenes.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
              <p className="text-zinc-500 dark:text-zinc-500 mb-4">
                No scenes yet. Start by adding your first scene.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}









