import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { selfReferencingCanonical } from "@/lib/seo/site-metadata";
import Link from "next/link";
import { brandPrimaryButtonClassName, brandPrimaryButtonStyle, brandSurfaceButtonClassName, brandSurfaceCardClassName, brandSurfaceCardStyle, brandSurfaceLabelClassName, brandSurfaceLabelStyle, brandSurfaceValueClassName, brandSurfaceValueStyle } from "@/lib/ui/button-classes";
import { BookOpen, PenTool, TrendingUp, Calendar, ArrowRight, Plus } from "lucide-react";
import { getStyleGuidesForUser } from "../style-guide/actions";
import { StyleGuideSelector } from "./style-guide-selector";
import { getRequestUser } from "@/lib/auth/request-user";
import { isBlogAdminUser } from "@/lib/blog/admin";
import { dashboardDataLoadWarning } from "@/lib/db/connection-error";
import { loadDashboardData } from "@/lib/dashboard/load-dashboard-data";

export const dynamic = "force-dynamic";

export const metadata = selfReferencingCanonical("/dashboard");

type DashboardPageProps = {
  searchParams: Promise<{ blogAdmin?: string; usageAdmin?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { user, error } = await getRequestUser();

  if (error || !user) {
    redirect(`${AUTH_ROUTES.SIGN_IN}?reason=dashboard-auth`);
  }

  const sp = await searchParams;
  const blogAdminAccessDenied = sp.blogAdmin === "denied";
  const usageAdminAccessDenied = sp.usageAdmin === "denied";

  let stats = {
    totalStories: 0,
    totalWords: 0,
    streak: 0,
    completionRate: 0,
  };
  let recentStories: Awaited<ReturnType<typeof loadDashboardData>>["recentStories"] = [];
  let dataLoadWarning: string | null = null;

  try {
    const dashboardData = await loadDashboardData(user.id);
    stats = dashboardData.stats;
    recentStories = dashboardData.recentStories;
  } catch (error) {
    console.error("Failed to load dashboard data", error);
    dataLoadWarning = dashboardDataLoadWarning(error, {
      isOwner: isBlogAdminUser(user.id, user.email),
    });
  }

  let styleGuides: Awaited<ReturnType<typeof getStyleGuidesForUser>> = [];
  try {
    styleGuides = await getStyleGuidesForUser(user.id);
  } catch (error) {
    console.error("Failed to load style guides for dashboard", error);
  }

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  let greeting = "Welcome back";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";

  return (
    <div className="min-h-screen bg-brand-seafoam dark:bg-brand-ink pb-12">
      {dataLoadWarning ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
          <p className="mx-auto max-w-7xl text-sm text-amber-950 dark:text-amber-100">{dataLoadWarning}</p>
        </div>
      ) : null}
      {blogAdminAccessDenied && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="text-sm text-amber-950 dark:text-amber-100">
              <span className="font-medium">Blog admin is restricted.</span> Your account is signed in, but it is not in{" "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/50">BLOG_ADMIN_USER_IDS</code>.
              Your current user id is{" "}
              <code className="break-all rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/50">{user.id}</code>
              — add this exact value to that env var locally and on your host, then redeploy.
            </p>
            <Link
              href="/dashboard"
              className="shrink-0 text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50"
            >
              Dismiss
            </Link>
          </div>
        </div>
      )}
      {usageAdminAccessDenied && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="text-sm text-amber-950 dark:text-amber-100">
              <span className="font-medium">Usage admin is restricted.</span> Only the site owner can view usage metrics.
            </p>
            <Link
              href="/dashboard"
              className="shrink-0 text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50"
            >
              Dismiss
            </Link>
          </div>
        </div>
      )}
      {/* Header Section */}
      <div className="bg-white/80 dark:bg-brand-ink/80 border-b border-brand-seafoam/40">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-brand-ink dark:text-brand-yellow">
                {greeting}, {user.user_metadata?.display_name || user.email?.split('@')[0] || "Storyteller"}
              </h1>
              <p className="mt-2 text-brand-ink/85 dark:text-brand-seafoam">
                Ready to continue your creative journey?
              </p>
            </div>
            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              <Link
                href="/create-story"
                className={`${brandPrimaryButtonClassName} w-full`}
                style={brandPrimaryButtonStyle}
              >
                <Plus className="h-4 w-4" />
                New Story
              </Link>
              <div className="w-full">
                <StyleGuideSelector styleGuides={styleGuides} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`${brandSurfaceCardClassName} p-6 flex items-center gap-4`} style={brandSurfaceCardStyle}>
            <div className="p-3 rounded-full bg-brand-seafoam/25 text-brand-teal dark:text-brand-yellow">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className={`text-sm font-medium ${brandSurfaceLabelClassName}`} style={brandSurfaceLabelStyle}>Total Stories</p>
              <h3 className={`text-2xl font-bold ${brandSurfaceValueClassName}`} style={brandSurfaceValueStyle}>{stats.totalStories}</h3>
            </div>
          </div>

          <div className={`${brandSurfaceCardClassName} p-6 flex items-center gap-4`} style={brandSurfaceCardStyle}>
            <div className="p-3 rounded-full bg-brand-yellow/25 text-brand-orange dark:text-brand-yellow">
              <PenTool className="h-6 w-6" />
            </div>
            <div>
              <p className={`text-sm font-medium ${brandSurfaceLabelClassName}`} style={brandSurfaceLabelStyle}>Total Words</p>
              <h3 className={`text-2xl font-bold ${brandSurfaceValueClassName}`} style={brandSurfaceValueStyle}>{stats.totalWords.toLocaleString()}</h3>
            </div>
          </div>

          <div className={`${brandSurfaceCardClassName} p-6 flex items-center gap-4`} style={brandSurfaceCardStyle}>
            <div className="p-3 rounded-full bg-brand-teal/20 text-brand-teal dark:text-brand-seafoam">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className={`text-sm font-medium ${brandSurfaceLabelClassName}`} style={brandSurfaceLabelStyle}>Writing Streak</p>
              <h3 className={`text-2xl font-bold ${brandSurfaceValueClassName}`} style={brandSurfaceValueStyle}>{stats.streak} Days</h3>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-brand-ink dark:text-brand-yellow">Recent Activity</h2>
            <Link 
              href="/stories" 
              className="text-sm font-medium text-brand-ink/85 dark:text-brand-seafoam hover:text-brand-teal dark:hover:text-brand-yellow flex items-center gap-1"
            >
              View all stories
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentStories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentStories.map((story) => (
                <div 
                  key={story.id} 
                  className={`group ${brandSurfaceCardClassName} overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full`}
                >
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <span className="inline-flex items-center rounded-full border border-brand-seafoam/40 px-2.5 py-0.5 text-xs font-semibold text-brand-ink">
                        {story.mode === 'quick' ? 'Quick Mode' : 'Comprehensive'}
                      </span>
                      <span className="text-xs text-brand-ink/80 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {story.updatedAt
                          ? new Date(story.updatedAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-brand-ink mb-2 line-clamp-1">
                      {story.title || "Untitled Story"}
                    </h3>
                    
                    <p className="text-sm text-brand-ink/85 line-clamp-3 mb-4">
                      {story.description || "No description provided."}
                    </p>
                  </div>
                  
                  <div className="px-6 py-4 bg-brand-cream/60 dark:bg-brand-ink/60 border-t border-brand-seafoam/30 mt-auto">
                    <Link
                      href={`/stories/${story.id}`}
                      className={`${brandSurfaceButtonClassName} w-auto border border-brand-seafoam/50 px-4 py-2 hover:opacity-90 transition-opacity`}
                    >
                      Continue Writing
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-brand-seafoam/50 bg-brand-cream/60 dark:bg-brand-ink/60 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-seafoam/20">
                <BookOpen className="h-6 w-6 text-brand-teal dark:text-brand-seafoam" />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-brand-ink dark:text-brand-yellow">No stories yet</h3>
              <p className="mt-1 text-sm text-brand-ink/85 dark:text-brand-seafoam">
                Get started by creating your first story today.
              </p>
              <div className="mt-6">
                <Link
                  href="/create-story"
                  className={`${brandPrimaryButtonClassName} px-3 py-2 text-sm font-semibold shadow-sm`}
                  style={brandPrimaryButtonStyle}
                >
                  <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                  Create Story
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}







