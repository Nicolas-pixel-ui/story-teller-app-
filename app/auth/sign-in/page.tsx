import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthCallbackUrlForRequest } from "@/lib/auth/callback-url";
import { getRequestUser } from "@/lib/auth/request-user";
import { AUTH_ROUTES, withRedirectedFrom } from "@/lib/auth/routes";
import { isAuthDebugEnabled } from "@/lib/auth/debug";
import { safeRelativeNextPath } from "@/lib/auth/safe-next-path";
import { createActionClient } from "@/lib/supabase/server-action";
import { buildDynamicPageMetadata } from "@/lib/seo/dynamic-metadata";
import SignInForm from "./sign-in-form";

type SignInState = {
  error?: string;
  success?: string;
  otpSent?: boolean;
  authMethod?: "otp" | "magic" | "password";
};

function getAuthErrorMessage(
  error?: string,
  errorCode?: string,
  errorDescription?: string
): string | null {
  const normalizedDescription = errorDescription
    ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
    : "";

  if (errorCode === "otp_expired") {
    return "Your magic link expired or was already used. Request a new magic link and use only the latest email.";
  }
  if (
    errorCode === "exchange_failed" &&
    normalizedDescription.toLowerCase().includes("pkce code verifier not found")
  ) {
    return "That email link cannot be completed in this browser session. Sign in with your password or enter a 6-digit email code on this page instead.";
  }
  if (normalizedDescription.toLowerCase().includes("email rate limit exceeded")) {
    return "Too many email requests were sent. Wait about a minute, then request another code, or use Google/password sign-in.";
  }
  if (normalizedDescription) {
    return normalizedDescription;
  }
  if (error === "oauth" || error === "otp") {
    return "Sign-in could not be completed. Please request a new magic link and try again.";
  }
  return null;
}

export async function generateMetadata() {
  const metadata = await buildDynamicPageMetadata("sign-in", {
    title: "Sign in - secure account access",
    description:
      "Sign in to Story Teller to plan structure, scenes, and maps in one place, then continue your drafts with less friction and better momentum. Continue now.",
    canonicalPath: AUTH_ROUTES.SIGN_IN,
  });

  return {
    ...metadata,
    robots: { index: false, follow: true },
  };
}

async function signInAction(
  previousState: SignInState | null | void,
  formData: FormData
) {
  "use server";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const otpRaw = (formData.get("otp") as string | null)?.trim() || "";
  const otp = otpRaw.replace(/\s|-/g, "");
  const authMethod = (formData.get("authMethod") as string) || "otp";
  const rawNext = formData.get("redirectedFrom") as string | null;
  const nextPath = safeRelativeNextPath(rawNext || undefined);

  if (!email) {
    return { error: "Email is required" };
  }

  const supabase = await createActionClient();

  if (authMethod === "otp") {
    if (!otp) {
      const callbackUrl = new URL(await getAuthCallbackUrlForRequest());
      callbackUrl.searchParams.set("next", nextPath);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        return {
          error: error.message,
          authMethod: "otp" as const,
          otpSent: false,
        };
      }

      return {
        success:
          "We sent a 6-digit code to your email. Enter it below to complete sign-in.",
        authMethod: "otp" as const,
        otpSent: true,
      };
    }

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      return {
        error:
          "Invalid or expired code. Request a new email code and enter the latest 6-digit code.",
        authMethod: "otp" as const,
        otpSent: true,
      };
    }

    redirect(nextPath);
  }

  if (authMethod === "magic") {
    const callbackUrl = new URL(await getAuthCallbackUrlForRequest());
    callbackUrl.searchParams.set("next", nextPath);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      return { error: error.message, authMethod: "magic" as const };
    }

    return {
      success:
        "Check your email for the magic link. Use only the latest email link.",
      authMethod: "magic" as const,
    };
  }

  if (!password) {
    return { error: "Password is required for password sign-in" };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Unsupported provider")) {
      return {
        error:
          "Google sign-in is currently not enabled. Please enable Google provider in Supabase Authentication settings and try again.",
        authMethod: "password" as const,
      };
    }
    return { error: error.message, authMethod: "password" as const };
  }

  redirect(nextPath);
}

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    error_code?: string;
    error_description?: string;
    redirectedFrom?: string;
    signup?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const sp = await searchParams;
  const authErrorMessage = getAuthErrorMessage(
    sp.error,
    sp.error_code,
    sp.error_description
  );
  const redirectedFrom = sp.redirectedFrom;
  const { user, source } = await getRequestUser();
  const authDebugEnabled = isAuthDebugEnabled();

  if (authDebugEnabled) {
    console.info("[auth-debug] sign-in-page-user-check", {
      source,
      hasUser: Boolean(user),
      redirectedFrom: redirectedFrom ?? null,
      error: sp.error ?? null,
      errorCode: sp.error_code ?? null,
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
            <p>page: sign-in</p>
            <p>source: {source}</p>
            <p>hasUser: {String(Boolean(user))}</p>
            <p>redirectedFrom: {redirectedFrom ?? "null"}</p>
            <p>error: {sp.error ?? "null"}</p>
            <p>error_code: {sp.error_code ?? "null"}</p>
          </div>
        ) : null}
        {sp.signup === "confirm" && (
          <div
            className="rounded-md bg-green-50 dark:bg-green-900/20 p-4"
            role="status"
          >
            <p className="text-sm text-green-900 dark:text-green-100">
              Check your email for a confirmation link to activate your account. Open the link in
              this same browser when you can. If the link does not log you in automatically, return
              here and sign in with the password you just created (or request a 6-digit email code).
            </p>
          </div>
        )}
        {authErrorMessage && (
          <div
            className="rounded-md bg-red-50 dark:bg-red-900/20 p-4"
            role="alert"
          >
            <p className="text-sm text-red-800 dark:text-red-200">
              {authErrorMessage}
            </p>
          </div>
        )}
        <div>
          <h2 className="text-3xl font-bold text-center text-brand-ink dark:text-brand-yellow">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-brand-ink/85 dark:text-brand-seafoam">
            Or{" "}
            <Link
              href={withRedirectedFrom(AUTH_ROUTES.SIGN_UP, redirectedFrom)}
              className="font-medium text-brand-teal dark:text-brand-yellow hover:underline"
            >
              create a new account
            </Link>
          </p>
        </div>

        <SignInForm
          redirectedFrom={redirectedFrom}
          signInAction={signInAction}
        />
      </div>
    </div>
  );
}
