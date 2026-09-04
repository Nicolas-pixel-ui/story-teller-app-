import Link from "next/link";
import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";
import { SeoReferenceTabs } from "@/components/settings/seo-reference-tabs";
import { getAppUrl } from "@/lib/config/env";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_PAGE_TITLE,
  SITE_NAME,
  TITLE_TEMPLATE,
  selfReferencingCanonical,
} from "@/lib/seo/site-metadata";
import ProfileForm from "./profile-form";
import { revalidatePath } from "next/cache";
import AdminGrantCreditsForm from "./admin-grant-credits-form";
import { creditReasonLabel } from "@/lib/credits/constants";
import { CREDITS_PER_AI_USE, DAILY_FREE_QUOTA } from "@/lib/credits/service";

export const metadata = selfReferencingCanonical("/settings");
const CREDIT_ADMIN_OWNER_EMAIL = "nicolas@hartmanns.net";

async function updateProfileAction(previousState: { error?: string; success?: string } | null | void, formData: FormData) {
  "use server";

  const displayName = formData.get("displayName") as string;
  const bio = formData.get("bio") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    if (!user.email) {
      return { error: "Your account has no email; cannot save profile." };
    }
    const { updateUserProfile } = await import("@/lib/settings/update-user-profile");
    await updateUserProfile(user.id, {
      email: user.email,
      displayName,
      bio,
    });
    return { success: "Profile updated successfully" };
  } catch (error) {
    console.error("Error updating profile:", error);
    try {
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          bio,
        },
      });
      if (authUpdateError) {
        throw authUpdateError;
      }
      return { success: "Profile updated successfully" };
    } catch (fallbackError) {
      console.error("Error updating profile via auth metadata fallback:", fallbackError);
      return { error: "Failed to update profile" };
    }
  }
}

type GrantCreditsState = { error?: string; success?: string } | null;

async function grantCreditsAction(
  previousState: GrantCreditsState,
  formData: FormData
): Promise<GrantCreditsState> {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isCreditAdminOwner =
    (user?.email ?? "").trim().toLowerCase() === CREDIT_ADMIN_OWNER_EMAIL;
  if (!user || !isCreditAdminOwner) {
    return { error: "Unauthorized" };
  }

  const action = String(formData.get("creditAction") ?? "grant").trim();
  const {
    adminGrantCredits,
    adminResetCreditsToDailyQuota,
  } = await import("@/lib/credits/service");

  if (action === "reset_daily") {
    const targetUserId = String(formData.get("targetUserId") ?? user.id).trim();
    if (!targetUserId) {
      return { error: "Target user ID is required." };
    }
    try {
      const balance = await adminResetCreditsToDailyQuota(targetUserId);
      revalidatePath("/settings");
      revalidatePath("/dashboard");
      return { success: `Reset to full daily allowance. Balance is now ${balance}/${DAILY_FREE_QUOTA}.` };
    } catch (error) {
      console.error("Error resetting credits:", error);
      return {
        error:
          "Could not reset credits right now. Please try again in a moment.",
      };
    }
  }

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const amount = Number.parseInt(String(formData.get("amount") ?? "0"), 10);
  const reason = String(formData.get("reason") ?? "admin_grant").trim() || "admin_grant";

  if (!targetUserId) {
    return { error: "Target user ID is required." };
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return { error: "Amount must be a positive integer." };
  }

  try {
    const balance = await adminGrantCredits(targetUserId, amount, reason);
    revalidatePath("/settings");
    return { success: `Granted ${amount} credits. New balance: ${balance}.` };
  } catch (error) {
    console.error("Error granting credits:", error);
    return {
      error:
        "Could not grant credits right now. Please try again in a moment.",
    };
  }
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(AUTH_ROUTES.SIGN_IN);
  }

  if (!user.email) {
    redirect(`${AUTH_ROUTES.SIGN_IN}?reason=settings-no-email`);
  }

  const displayNameFromAuth =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : null;

  let userProfile: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    preferences: unknown;
    analytics: unknown;
    createdAt: Date;
    updatedAt: Date;
  } = {
    id: user.id,
    email: user.email,
    displayName: displayNameFromAuth,
    avatarUrl: null,
    bio: null,
    preferences: {},
    analytics: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let recentCreditTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    reason: string;
    createdAt: Date;
  }> = [];
  let creditBalance = 0;

  try {
    const { loadSettingsPageData } = await import("@/lib/settings/load-settings-data");
    const data = await loadSettingsPageData(user.id, {
      id: user.id,
      email: user.email,
      displayName: displayNameFromAuth,
    });
    userProfile = data.profile;
    recentCreditTransactions = data.recentCreditTransactions;
  } catch (error) {
    console.error("[SETTINGS][LOAD_SETTINGS_PAGE_DATA_FAILED]", error);
  }

  try {
    const { getUserCreditBalance } = await import("@/lib/credits/service");
    creditBalance = await getUserCreditBalance(user.id);
  } catch (error) {
    console.error("[SETTINGS][GET_CREDIT_BALANCE_FAILED]", error);
  }
  const canGrantCredits = (user.email ?? "").trim().toLowerCase() === CREDIT_ADMIN_OWNER_EMAIL;

  const metadataBaseUrl = getAppUrl().replace(/\/$/, "") || "http://localhost:3000";

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-ink py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
           <Link
             href="/dashboard"
             className="text-sm text-brand-ink/85 dark:text-brand-seafoam hover:text-brand-teal dark:hover:text-brand-yellow"
           >
             ← Back to Dashboard
           </Link>
        </div>
        <div className="bg-white dark:bg-brand-ink/80 shadow rounded-lg overflow-hidden border border-brand-seafoam/30">
          <div className="px-4 py-5 sm:px-6 border-b border-brand-seafoam/30">
            <h3 className="text-lg font-medium leading-6 text-brand-ink dark:text-brand-yellow">
              Profile Settings
            </h3>
            <p className="mt-1 text-sm text-brand-ink/80 dark:text-brand-seafoam">
              Manage your public profile and account settings.
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <ProfileForm 
              user={user} 
              profile={userProfile} 
              updateProfileAction={updateProfileAction} 
            />
          </div>
        </div>

        <div id="credits" className="mt-8 scroll-mt-24 bg-white dark:bg-brand-ink/80 shadow rounded-lg overflow-hidden border border-brand-seafoam/30">
          <div className="px-4 py-5 sm:px-6 border-b border-brand-seafoam/30">
            <h3 className="text-lg font-medium leading-6 text-brand-ink dark:text-brand-yellow">AI credits</h3>
            <p className="mt-1 text-sm text-brand-ink/80 dark:text-brand-seafoam">
              You get {DAILY_FREE_QUOTA} AI credits per day (UTC). Each AI generation uses{" "}
              <span className="font-semibold text-brand-ink dark:text-brand-yellow">{CREDITS_PER_AI_USE} credits</span>
              {" "}(up to {Math.floor(DAILY_FREE_QUOTA / CREDITS_PER_AI_USE)} per day). Every use appears below as −{CREDITS_PER_AI_USE}. When you run out, wait until tomorrow for a full refill.
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <div className="rounded-md border border-brand-seafoam/40 px-4 py-3 bg-brand-cream/50 dark:bg-brand-ink/70">
              <p className="text-xs uppercase tracking-wide text-brand-ink/80 dark:text-brand-seafoam">Current balance</p>
              <p className="mt-1 text-2xl font-semibold text-brand-ink dark:text-brand-yellow">
                {creditBalance}/{DAILY_FREE_QUOTA}
              </p>
              <p className="mt-1 text-xs text-brand-ink/70 dark:text-brand-seafoam">
                Cost per AI generation: −{CREDITS_PER_AI_USE} credits
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-brand-ink dark:text-brand-seafoam mb-2">Recent transactions</h4>
              {recentCreditTransactions.length === 0 ? (
                <p className="text-sm text-brand-ink/80 dark:text-brand-seafoam">
                  No credit transactions yet. The next AI generation will show here as −{CREDITS_PER_AI_USE} credits.
                </p>
              ) : (
                <div className="divide-y divide-brand-seafoam/30 rounded-md border border-brand-seafoam/30">
                  {recentCreditTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-brand-ink dark:text-brand-seafoam">
                          {creditReasonLabel(tx.reason)}
                        </p>
                        <p className="text-xs text-brand-ink/80 dark:text-brand-seafoam">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "Unknown date"}
                        </p>
                      </div>
                      <span
                        className={`ml-3 shrink-0 font-semibold ${
                          tx.amount >= 0
                            ? "text-brand-teal dark:text-brand-yellow"
                            : "text-brand-orange dark:text-brand-yellow"
                        }`}
                      >
                        {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} credits
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {canGrantCredits ? (
          <>
          <div className="mt-8 bg-white dark:bg-brand-ink/80 shadow rounded-lg overflow-hidden border border-brand-seafoam/30">
            <div className="px-4 py-5 sm:px-6 border-b border-brand-seafoam/30">
              <h3 className="text-lg font-medium leading-6 text-brand-ink dark:text-brand-yellow">
                Admin: Grant credits
              </h3>
              <p className="mt-1 text-sm text-brand-ink/80 dark:text-brand-seafoam">
                Temporary support tool to manually top up user credits.
              </p>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-6">
              <AdminGrantCreditsForm
                grantCreditsAction={grantCreditsAction}
                defaultTargetUserId={user.id}
              />
            </div>
          </div>
          </>
        ) : null}

        <div className="mt-8 bg-white dark:bg-brand-ink/80 shadow rounded-lg overflow-hidden border border-brand-seafoam/30">
          <div className="px-4 py-5 sm:px-6 border-b border-brand-seafoam/30">
            <h3 className="text-lg font-medium leading-6 text-brand-ink dark:text-brand-yellow">SEO reference</h3>
            <p className="mt-1 text-sm text-brand-ink/80 dark:text-brand-seafoam">
              Read-only values your site uses for title, meta description, and canonical URLs. Changes require editing
              code or deployment configuration.
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <SeoReferenceTabs
              siteName={SITE_NAME}
              titleTemplate={TITLE_TEMPLATE}
              defaultPageTitle={DEFAULT_PAGE_TITLE}
              defaultDescription={DEFAULT_DESCRIPTION}
              metadataBaseUrl={metadataBaseUrl}
              exampleCanonicalPaths={[
                { path: "/", label: "Home" },
                { path: "/blogs", label: "Blogs index" },
                { path: "/blog/your-post-slug", label: "Example blog post (replace slug)" },
                { path: AUTH_ROUTES.SIGN_IN, label: "Sign in (robots noindex)" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

