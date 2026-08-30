import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthCallbackUrlForRequest } from "@/lib/auth/callback-url";
import { getRequestUser } from "@/lib/auth/request-user";
import { AUTH_ROUTES, withRedirectedFrom, isAuthRoute } from "@/lib/auth/routes";
import { isAuthDebugEnabled } from "@/lib/auth/debug";
import { safeRelativeNextPath } from "@/lib/auth/safe-next-path";
import { formatPasswordAuthError } from "@/lib/auth/format-password-auth-error";
import { createActionClient } from "@/lib/supabase/server-action";
import { ensureUserProfileFromAuthUser } from "@/lib/users/ensure-profile";
import { buildDynamicPageMetadata } from "@/lib/seo/dynamic-metadata";
import SignUpForm from "./sign-up-form";

export async function generateMetadata() {
  const metadata = await buildDynamicPageMetadata("sign-up", {
    title: "Sign up - create your free account",
    description:
      "Create a free Story Teller account to plan structure, scenes, and maps with guided workflows, then start your first draft and build momentum today. Sign up now.",
    canonicalPath: AUTH_ROUTES.SIGN_UP,
  });

  return {
    ...metadata,
    robots: { index: false, follow: true },
  };
}

async function signUpAction(previousState: { error?: string } | null | void, formData: FormData) {
  "use server";

  // Defensive check for formData
  if (!formData) {
    return { error: "Form data is missing" };
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const rawNext = formData.get("redirectedFrom") as string | null;
  const nextPath = safeRelativeNextPath(rawNext || undefined);

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = await createActionClient();

  const callbackUrl = new URL(await getAuthCallbackUrlForRequest());
  callbackUrl.searchParams.set("next", nextPath);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return { error: formatPasswordAuthError(error) ?? error.message };
  }

  if (data.session?.user) {
    await ensureUserProfileFromAuthUser(data.session.user);
    redirect(nextPath);
  }

  const signIn = new URL(AUTH_ROUTES.SIGN_IN, "http://local.invalid");
  signIn.searchParams.set("signup", "confirm");
  signIn.searchParams.set("method", "password");
  signIn.searchParams.set("email", email.trim());
  if (rawNext && !isAuthRoute(rawNext)) {
    signIn.searchParams.set("redirectedFrom", rawNext);
  }
  redirect(`${signIn.pathname}${signIn.search}`);
}

type SignUpPageProps = {
  searchParams: Promise<{ redirectedFrom?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const sp = await searchParams;
  const redirectedFrom = sp.redirectedFrom;
  const { user, source } = await getRequestUser();
  const authDebugEnabled = isAuthDebugEnabled();

  if (authDebugEnabled) {
    console.info("[auth-debug] sign-up-page-user-check", {
      source,
      hasUser: Boolean(user),
      redirectedFrom: redirectedFrom ?? null,
    });
  }

  if (user) {
    redirect(safeRelativeNextPath(redirectedFrom));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream dark:bg-brand-ink px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-brand-seafoam/30 bg-white/95 dark:bg-brand-ink/85 p-8 shadow-lg">
        {authDebugEnabled ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-semibold">AUTH DEBUG</p>
            <p>page: sign-up</p>
            <p>source: {source}</p>
            <p>hasUser: {String(Boolean(user))}</p>
            <p>redirectedFrom: {redirectedFrom ?? "null"}</p>
          </div>
        ) : null}
        <div>
          <h2 className="text-3xl font-bold text-center text-brand-ink dark:text-brand-yellow">
            Create an account
          </h2>
          <p className="mt-2 text-center text-sm text-brand-ink/85 dark:text-brand-seafoam">
            Or{" "}
            <Link
              href={withRedirectedFrom(AUTH_ROUTES.SIGN_IN, redirectedFrom)}
              className="font-medium text-brand-teal dark:text-brand-yellow hover:underline"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <SignUpForm redirectedFrom={redirectedFrom} signUpAction={signUpAction} />
      </div>
    </div>
  );
}

