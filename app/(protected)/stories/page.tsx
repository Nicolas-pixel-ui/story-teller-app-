import Link from "next/link";
import { brandPrimaryButtonClassName, brandPrimaryButtonStyle } from "@/lib/ui/button-classes";
import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { selfReferencingCanonical } from "@/lib/seo/site-metadata";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getRequestUser } from "@/lib/auth/request-user";
import { loadUserStories } from "@/lib/stories/load-user-stories";
import { isDirectPostgresConnectionError } from "@/lib/db/supabase-fallback";
import { shouldPreferSupabaseOverPostgres } from "@/lib/db/pooling-url-health";

export const metadata = selfReferencingCanonical("/stories");

async function getStories() {
  try {
    const { user, error: authError } = await getRequestUser();

    if (authError || !user) {
      return { stories: [], error: "Unauthorized" };
    }

    const userStories = await loadUserStories(user.id);

    return {
      stories: userStories.map((s) => ({
        ...s,
        description: s.description || "",
      })),
      error: null,
    };
  } catch (error) {
    console.error("Error fetching stories from DB:", error);
    return {
      stories: [],
      error: isDirectPostgresConnectionError(error)
        ? "Could not load stories. The database pooler URL on Vercel may be wrong — stories are loaded via Supabase when possible."
        : "Error loading stories from database.",
    };
  }
}

async function deleteStoryAction(storyId: string) {
  "use server";

  const { user, error: authError } = await getRequestUser();

  if (authError || !user) {
    redirect(`${AUTH_ROUTES.SIGN_IN}?reason=stories-delete-auth`);
  }

  try {
    if (shouldPreferSupabaseOverPostgres()) {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", storyId)
        .eq("user_id", user.id);
      if (error) {
        throw error;
      }
    } else {
      try {
        await db.delete(stories).where(and(eq(stories.id, storyId), eq(stories.userId, user.id)));
      } catch (error) {
        if (!isDirectPostgresConnectionError(error)) {
          throw error;
        }
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const { error: deleteError } = await supabase
          .from("stories")
          .delete()
          .eq("id", storyId)
          .eq("user_id", user.id);
        if (deleteError) {
          throw deleteError;
        }
      }
    }

    revalidatePath("/stories");
  } catch (error) {
    console.error("Error deleting story:", error);
    return;
  }
}

export default async function StoriesPage() {
  let user: { email?: string | null } | null = null;
  let userError: Error | null = null;
  
  try {
    const { user: authUser, error: authError } = await getRequestUser();

    if (authError) {
      userError = authError;
      console.error("Error getting user:", authError);
    } else {
      user = authUser;
    }
  } catch (error) {
    userError = error instanceof Error ? error : new Error("Unknown authentication error");
    console.error("Error in authentication check:", error);
  }

  // If not authenticated, redirect to sign-in
  if (!user || userError) {
    redirect(`${AUTH_ROUTES.SIGN_IN}?reason=stories-page-auth`);
  }

  // Fetch stories with defensive error handling
  let storiesList: Array<{ id: string; title: string; description: string | null; createdAt: Date | string }> = [];
  let storiesError: string | null = null;

  try {
    const result = await getStories();
    storiesList = Array.isArray(result.stories) ? result.stories : [];
    storiesError = result.error;
  } catch (error) {
    // Final catch for any unexpected errors in getStories
    console.error("Unexpected error in getStories:", error);
    // In dev, show the full error stack to help debugging
    const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
    storiesError = process.env.NODE_ENV === "development" 
      ? `Dev Error: ${errorMessage}`
      : "Error loading stories. Could not connect to the API.";
    storiesList = [];
  }

  // Render the page with proper error handling
  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-ink">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink dark:text-brand-yellow">
              My Stories
            </h1>
            <p className="mt-2 text-sm text-brand-ink/85 dark:text-brand-seafoam">
              Welcome back, {user?.email || "User"}
            </p>
          </div>
          <Link
            href="/create-story"
            className={brandPrimaryButtonClassName}
            style={brandPrimaryButtonStyle}
          >
            Create Story
          </Link>
        </div>

        {/* Display error message if stories failed to load */}
        {storiesError && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-12 text-center">
            <div className="text-lg text-red-600 dark:text-red-300">
              Error loading stories. Could not connect to the API.
            </div>
            {storiesError && (
              <div className="mt-2 text-sm text-red-500 dark:text-red-400">
                {storiesError}
              </div>
            )}
          </div>
        )}

        {/* Empty state - no stories and no error (successful empty response) */}
        {!storiesError && storiesList.length === 0 && (
          <div className="rounded-lg border border-brand-seafoam/30 bg-white dark:bg-brand-ink/80 p-12 text-center">
            <div className="text-lg text-brand-ink/85 dark:text-brand-seafoam">
              You haven't created any stories yet. Start writing!
            </div>
            <Link
              href="/create-story"
              className={`mt-6 inline-block ${brandPrimaryButtonClassName}`}
              style={brandPrimaryButtonStyle}
            >
              Create your first story
            </Link>
          </div>
        )}

        {/* Stories list - show if we have stories (even if there was a warning/error) */}
        {storiesList.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {storiesList
              .filter((story) => story && story.id && story.title) // Filter out invalid stories
              .map((story: { id: string; title: string; description: string | null; createdAt: Date | string }) => (
                <div
                  key={story.id}
                  className="group rounded-lg border border-brand-seafoam/30 bg-white dark:bg-brand-ink/80 p-6 hover:shadow-lg transition-shadow flex flex-col"
                >
                  <Link href={`/stories/${story.id}`} className="flex-1 block">
                    <div>
                      <h3 className="text-xl font-semibold text-brand-ink dark:text-brand-yellow group-hover:underline">
                        {story.title}
                      </h3>
                      {story.description && (
                        <p className="mt-2 line-clamp-3 text-sm text-brand-ink/85 dark:text-brand-seafoam">
                          {story.description}
                        </p>
                      )}
                      <p className="mt-4 text-xs text-brand-ink/80 dark:text-brand-seafoam">
                        {story.createdAt 
                          ? new Date(story.createdAt).toLocaleDateString() 
                          : "Unknown date"}
                      </p>
                    </div>
                  </Link>
                  <div className="mt-4 flex gap-2 pt-4 border-t border-brand-seafoam/30">
                    <Link
                      href={`/stories/${story.id}/edit`}
                      className="flex-1 rounded-md border border-brand-seafoam/50 px-3 py-2 text-center text-sm font-medium text-brand-ink dark:text-brand-seafoam hover:bg-brand-cream dark:hover:bg-brand-seafoam/15"
                    >
                      Edit
                    </Link>
                    <form action={deleteStoryAction.bind(null, story.id) as any} className="flex-1">
                      <button
                        type="submit"
                        className="w-full rounded-md border border-red-300 dark:border-red-700 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

