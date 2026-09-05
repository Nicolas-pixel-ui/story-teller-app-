"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BLOG_ADMIN_BASE_PATH } from "@/lib/blog/admin";

const inactive =
  "text-sm text-brand-ink/70 dark:text-brand-seafoam hover:text-brand-teal dark:hover:text-brand-yellow transition-colors";
const active =
  "text-sm font-semibold text-brand-ink dark:text-brand-yellow hover:underline transition-colors";
const SEO_ADMIN_PATH = "/seo-admin";
const FEEDBACK_ADMIN_PATH = "/admin/feedback";
const USAGE_ADMIN_PATH = "/admin/usage";
const ANALYTICS_ADMIN_PATH = "/admin/analytics";

function navClass(isActive: boolean) {
  return isActive ? active : inactive;
}

/**
 * Primary app navigation (Dashboard, stories, style guides, settings, blogs, blog admin, seo admin).
 * Shared by the protected layout and the public blog header when signed in.
 */
export function AppShellNavLinks({
  showBlogAdmin = true,
  showUsageAdmin = false,
  showSeoAdmin = false,
}: {
  showBlogAdmin?: boolean;
  showUsageAdmin?: boolean;
  showSeoAdmin?: boolean;
}) {
  const pathname = usePathname() ?? "";

  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isStories = pathname === "/stories" || pathname.startsWith("/stories/");
  const isStyleGuides = pathname === "/style-guide" || pathname.startsWith("/style-guide/");
  const isSettings = pathname === "/settings" || pathname.startsWith("/settings/");
  const isFeedback =
    pathname === "/feedback" ||
    pathname.startsWith("/feedback/");
  const isBlogs =
    pathname === "/blogs" ||
    pathname.startsWith("/blogs/") ||
    pathname === "/blog" ||
    pathname.startsWith("/blog/");
  const isBlogAdmin = pathname === BLOG_ADMIN_BASE_PATH || pathname.startsWith(`${BLOG_ADMIN_BASE_PATH}/`);
  const isFeedbackAdmin = pathname === FEEDBACK_ADMIN_PATH || pathname.startsWith(`${FEEDBACK_ADMIN_PATH}/`);
  const isUsageAdmin =
    pathname === USAGE_ADMIN_PATH ||
    pathname.startsWith(`${USAGE_ADMIN_PATH}/`) ||
    pathname === ANALYTICS_ADMIN_PATH ||
    pathname.startsWith(`${ANALYTICS_ADMIN_PATH}/`);
  const isSeoAdmin = pathname === SEO_ADMIN_PATH || pathname.startsWith(`${SEO_ADMIN_PATH}/`);

  return (
    <>
      <Link href="/dashboard" className={navClass(isDashboard)}>
        Dashboard
      </Link>
      <Link href="/stories" className={navClass(isStories)}>
        My stories
      </Link>
      <Link href="/style-guide" className={navClass(isStyleGuides)}>
        Style Guides
      </Link>
      <Link href="/settings" className={navClass(isSettings)}>
        Settings
      </Link>
      <Link href="/feedback" className={navClass(isFeedback)}>
        Feedback
      </Link>
      <Link href="/blogs" className={navClass(isBlogs)} aria-label="Guides and articles">
        Blogs
      </Link>
      {showBlogAdmin ? (
        <Link href={BLOG_ADMIN_BASE_PATH} className={navClass(isBlogAdmin)}>
          Blog Admin
        </Link>
      ) : null}
      {showBlogAdmin ? (
        <Link href={FEEDBACK_ADMIN_PATH} className={navClass(isFeedbackAdmin)}>
          Feedback Admin
        </Link>
      ) : null}
      {showUsageAdmin ? (
        <Link href={USAGE_ADMIN_PATH} className={navClass(isUsageAdmin)}>
          Usage Admin
        </Link>
      ) : null}
      {showSeoAdmin ? (
        <Link href={SEO_ADMIN_PATH} className={navClass(isSeoAdmin)}>
          SEO Admin
        </Link>
      ) : null}
    </>
  );
}
