import Link from "next/link";
import { redirect } from "next/navigation";
import { AUTH_ROUTES, withRedirectedFrom } from "@/lib/auth/routes";
import { getAdminUsageStats, getRecentSignups, type AdminUsageStats, type RecentSignup } from "@/lib/admin/usage-queries";
import { USAGE_ADMIN_PATH } from "@/lib/admin/paths";
import { isUsageAdminUser, USAGE_ADMIN_ACCESS_DENIED_PATH } from "@/lib/admin/usage-access";
import { adminMetricsLoadWarning } from "@/lib/db/connection-error";
import { createClient } from "@/lib/supabase/server";
import { buildDynamicPageMetadata } from "@/lib/seo/dynamic-metadata";
import { LocalDateTime } from "./local-datetime";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildDynamicPageMetadata("usage-admin", {
    title: "Usage admin - Story Teller",
    description: "Private admin dashboard for user adoption and AI usage metrics.",
    canonicalPath: USAGE_ADMIN_PATH,
  });
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-brand-seafoam/30 bg-white/95 p-5 shadow-sm dark:border-brand-seafoam/20 dark:bg-brand-ink/85">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-ink/70 dark:text-brand-seafoam">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-brand-ink dark:text-brand-yellow">
        {value.toLocaleString()}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-brand-ink/60 dark:text-brand-seafoam/80">{hint}</p>
      ) : null}
    </div>
  );
}

export default async function UsageAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(withRedirectedFrom(AUTH_ROUTES.SIGN_IN, USAGE_ADMIN_PATH));
  }
  if (!isUsageAdminUser(user.id, user.email)) {
    redirect(USAGE_ADMIN_ACCESS_DENIED_PATH);
  }

  let stats: AdminUsageStats;
  let recentSignups: RecentSignup[];
  let loadError: string | null = null;

  try {
    [stats, recentSignups] = await Promise.all([getAdminUsageStats(), getRecentSignups()]);
  } catch (error) {
    console.error("Failed to load admin usage stats", error);
    loadError = adminMetricsLoadWarning(error);
    stats = {
      totalUsers: 0,
      newUsers7d: 0,
      newUsers30d: 0,
      activeUsers24h: 0,
      activeUsers7d: 0,
      activeUsers30d: 0,
      recentlyOnlineUsers: 0,
      totalStories: 0,
      totalAiGenerations: 0,
      aiGenerations7d: 0,
    };
    recentSignups = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink dark:text-brand-yellow">Usage admin</h1>
        <p className="mt-1 text-sm text-brand-ink/80 dark:text-brand-seafoam">
          How many people use Story Teller — registrations, activity, and AI generations.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {loadError}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-ink/80 dark:text-brand-seafoam">
          Users
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total registered users" value={stats.totalUsers} />
          <StatCard label="New sign-ups (7 days)" value={stats.newUsers7d} />
          <StatCard label="New sign-ups (30 days)" value={stats.newUsers30d} />
          <StatCard
            label="Daily active users (24h)"
            value={stats.activeUsers24h}
            hint="Story updates or AI credit use today"
          />
          <StatCard
            label="Active users (7 days)"
            value={stats.activeUsers7d}
            hint="Story updates or AI credit use"
          />
          <StatCard
            label="Active users (30 days)"
            value={stats.activeUsers30d}
            hint="Story updates or AI credit use"
          />
          <StatCard
            label="Recently online (~15 min)"
            value={stats.recentlyOnlineUsers}
            hint="Approximate — last sign-in within 15 minutes"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-ink/80 dark:text-brand-seafoam">
          Content &amp; AI
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total stories created" value={stats.totalStories} />
          <StatCard label="Total AI generations" value={stats.totalAiGenerations} />
          <StatCard label="AI generations (7 days)" value={stats.aiGenerations7d} />
        </div>
      </section>

      <section className="rounded-xl border border-brand-seafoam/20 bg-brand-cream/40 p-4 text-sm text-brand-ink/80 dark:bg-brand-ink/60 dark:text-brand-seafoam">
        <p className="font-medium text-brand-ink dark:text-brand-yellow">Real-time analytics</p>
        <p className="mt-1">
          For live page views, funnels, and session replay, use a third-party tool (Vercel Web
          Analytics, PostHog, or Plausible). Keep product metrics here; use analytics tools for
          traffic and behavior — embed their dashboard in a separate admin tab when needed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-ink/80 dark:text-brand-seafoam">
          Recent sign-ups
        </h2>
        {recentSignups.length === 0 ? (
          <p className="text-sm text-brand-ink/70 dark:text-brand-seafoam">No sign-ups yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-brand-seafoam/30 bg-white/95 dark:border-brand-seafoam/20 dark:bg-brand-ink/85">
            <table className="min-w-full text-sm">
              <thead className="border-b border-brand-seafoam/20 bg-brand-cream/50 dark:bg-brand-ink/70">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-brand-ink dark:text-brand-seafoam">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-brand-ink dark:text-brand-seafoam">
                    Signed up
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-seafoam/15">
                {recentSignups.map((signup) => (
                  <tr key={signup.id}>
                    <td className="px-4 py-3 text-brand-ink dark:text-brand-yellow">{signup.email}</td>
                    <td className="px-4 py-3 text-brand-ink/70 dark:text-brand-seafoam">
                      <LocalDateTime value={signup.createdAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p>
        <Link href="/dashboard" className="text-sm text-brand-ink/70 hover:underline dark:text-brand-seafoam">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
