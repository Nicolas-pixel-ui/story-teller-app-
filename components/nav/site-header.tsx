import { connection } from "next/server";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteHeaderFallback } from "@/components/nav/site-header-fallback";
import { AppShellNavLinks } from "@/components/nav/app-shell-nav-links";
import { PublicAuthLinks, PublicPrimaryNavLinks } from "@/components/nav/public-nav-links";
import { isBlogAdminUser } from "@/lib/blog/admin";
import { isUsageAdminUser } from "@/lib/admin/usage-access";
import { isDatabaseConfigured } from "@/lib/db/is-configured";
import { createClient } from "@/lib/supabase/server";

const DAILY_FREE_QUOTA = 140;
const CREDITS_PER_AI_USE = 10;

function isDynamicServerUsageError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    (error as Error & { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

/**
 * Single global navigation bar for the whole app (public + authenticated).
 * Wrapped in Suspense in root layout — must not run cookie auth during static prerender.
 */
export async function SiteHeader() {
  await connection();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let creditBalance: number | null = null;
    if (user && isDatabaseConfigured()) {
      try {
        const { getUserCreditBalance } = await import("@/lib/credits/service");
        creditBalance = await getUserCreditBalance(user.id);
      } catch (error) {
        console.error("Failed to load user credit balance in header", error);
        creditBalance = null;
      }
    }
    const canSeeBlogAdmin = isBlogAdminUser(user?.id, user?.email);
    const canSeeUsageAdmin = isUsageAdminUser(user?.id, user?.email);
    const canSeeSeoAdmin = (user?.email || "").trim().toLowerCase() === "nicolas@hartmanns.net";

    return (
      <header
        className="sticky top-0 z-30 border-b border-brand-seafoam/50 bg-brand-cream/90 backdrop-blur-sm dark:border-brand-seafoam/30 dark:bg-brand-ink/90"
        aria-label="Main"
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="text-sm font-semibold text-brand-ink dark:text-brand-yellow hover:text-brand-teal dark:hover:text-brand-seafoam"
            >
              Story Teller
            </Link>
            {user ? (
              <AppShellNavLinks
                showBlogAdmin={canSeeBlogAdmin}
                showUsageAdmin={canSeeUsageAdmin}
                showSeoAdmin={canSeeSeoAdmin}
              />
            ) : (
              <>
                <PublicPrimaryNavLinks />
                <PublicAuthLinks />
              </>
            )}
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/settings#credits"
                className="rounded-md border border-brand-seafoam/70 dark:border-brand-seafoam/40 bg-white/80 dark:bg-brand-ink/70 px-2.5 py-1 text-xs font-medium text-brand-ink dark:text-brand-seafoam hover:border-brand-teal hover:text-brand-teal dark:hover:text-brand-yellow"
              >
                Credits: {creditBalance ?? "—"}/{DAILY_FREE_QUOTA}
                <span className="sr-only"> ({CREDITS_PER_AI_USE} per AI use). Open credit history.</span>
              </Link>
              <SignOutButton />
            </div>
          ) : null}
        </div>
      </header>
    );
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      throw error;
    }
    console.error("SiteHeader failed to render", error);
    return <SiteHeaderFallback />;
  }
}
