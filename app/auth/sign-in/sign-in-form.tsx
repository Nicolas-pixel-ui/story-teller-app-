"use client";

import { FormEvent, useActionState, useEffect, useMemo, useState } from "react";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { parseAuthMethod, type AuthMethod } from "@/lib/auth/sign-in-method";
import { createClient } from "@/lib/supabase/client";
import { authFieldClassName } from "@/lib/ui/form-classes";

type SignInState = {
  error?: string;
  success?: string;
  otpSent?: boolean;
  authMethod?: "otp" | "magic" | "password";
};

type SignInAction = (
  previousState: SignInState | null | void,
  formData: FormData
) => Promise<SignInState | void | null>;

function toFriendlyAuthError(message: string): string {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();
  if (lower.includes("email rate limit exceeded")) {
    return "Too many email requests were sent. Wait about a minute, then request another code, or use Google/password sign-in now.";
  }
  if (lower.includes("pkce code verifier not found")) {
    return "That email link cannot be completed in this browser session. Sign in with your password or enter a 6-digit email code on this page instead.";
  }
  return normalized;
}

export default function SignInForm({
  redirectedFrom,
  signInAction,
  initialAuthMethod,
  initialEmail,
}: {
  redirectedFrom?: string;
  signInAction: SignInAction;
  initialAuthMethod?: AuthMethod;
  initialEmail?: string;
}) {
  const [state, formAction, isPending] = useActionState(signInAction, null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    parseAuthMethod(initialAuthMethod)
  );
  const [hashError, setHashError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientSuccess, setClientSuccess] = useState<string | null>(null);
  const [clientPending, setClientPending] = useState(false);
  const [otpSentLocal, setOtpSentLocal] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [otp, setOtp] = useState("");
  const isOtp = authMethod === "otp";
  const isMagic = authMethod === "magic";
  const isPassword = authMethod === "password";
  const otpSent = isOtp && (otpSentLocal || (state?.authMethod === "otp" && Boolean(state?.otpSent)));
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!window.location.hash) return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");

    if (errorCode === "otp_expired") {
      setHashError(
        "Your magic link expired or was already used. Request a new magic link and use only the latest email."
      );
    } else if (errorDescription) {
      setHashError(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
    }
  }, []);

  useEffect(() => {
    const destination = redirectedFrom || "/dashboard";

    const redirectIfSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        window.location.href = destination;
      }
    };

    void redirectIfSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        window.location.href = destination;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [redirectedFrom, supabase]);

  useEffect(() => {
    setClientError(null);
    setClientSuccess(null);
  }, [authMethod]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldownSeconds((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldownSeconds]);

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setClientError("Email is required");
      return;
    }

    setClientPending(true);
    setClientError(null);
    setClientSuccess(null);

    try {
      const normalizedCode = otp.trim().replace(/\s|-/g, "");

      if (!normalizedCode) {
        if (resendCooldownSeconds > 0) {
          setClientError(
            `Please wait ${resendCooldownSeconds}s before requesting another code.`
          );
          return;
        }
        const callbackUrl = new URL(AUTH_ROUTES.CALLBACK, window.location.origin);
        callbackUrl.searchParams.set("next", redirectedFrom || "/dashboard");
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: callbackUrl.toString(),
          },
        });
        if (error) {
          setClientError(toFriendlyAuthError(error.message));
          if (error.message.toLowerCase().includes("email rate limit exceeded")) {
            setResendCooldownSeconds(60);
          }
          return;
        }
        setOtpSentLocal(true);
        setResendCooldownSeconds(60);
        setClientSuccess(
          "We sent a 6-digit code to your email. Enter it below to complete sign-in."
        );
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: normalizedCode,
        type: "email",
      });
      if (error) {
        setClientError(toFriendlyAuthError(error.message));
        return;
      }

      window.location.href = redirectedFrom || "/dashboard";
    } finally {
      setClientPending(false);
    }
  }

  return (
    <form
      className="mt-8 space-y-6"
      action={isOtp ? undefined : formAction}
      onSubmit={isOtp ? handleOtpSubmit : undefined}
    >
      <input type="hidden" name="authMethod" value={authMethod} />
      <input type="hidden" name="redirectedFrom" value={redirectedFrom ?? ""} />
      
      {hashError && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{hashError}</p>
        </div>
      )}

      {state?.error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{state.error}</p>
        </div>
      )}
      {clientError && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{clientError}</p>
        </div>
      )}

      {state?.success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
          <p className="text-sm text-green-800 dark:text-green-200">{state.success}</p>
        </div>
      )}
      {clientSuccess && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
          <p className="text-sm text-green-800 dark:text-green-200">{clientSuccess}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-brand-ink dark:text-brand-seafoam"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authFieldClassName}
            placeholder="you@example.com"
          />
        </div>

        {isOtp && (
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-brand-ink dark:text-brand-seafoam"
            >
              6-digit code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required={false}
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className={authFieldClassName}
              placeholder="Enter code when you have it (optional)"
            />
          </div>
        )}

        {isPassword && (
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-brand-ink dark:text-brand-seafoam"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required={isPassword}
              className={authFieldClassName}
              placeholder="••••••••"
            />
          </div>
        )}

        {isOtp ? (
          <p className="text-xs text-brand-ink/80 dark:text-brand-seafoam">
            Use email code to avoid magic-link expiry from email scanners.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={isPending || clientPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-brand-cream bg-brand-ink dark:bg-brand-yellow dark:text-brand-ink hover:bg-brand-teal dark:hover:bg-brand-seafoam focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal dark:focus:ring-brand-yellow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(isPending || clientPending)
            ? "Processing..."
            : isOtp
              ? otpSent
                ? resendCooldownSeconds > 0
                  ? `Verify code (resend in ${resendCooldownSeconds}s)`
                  : "Send another code / verify code"
                : "Send email code / verify code"
              : isMagic
                ? "Send Magic Link"
                : "Sign in"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-brand-seafoam/40 dark:border-brand-seafoam/30" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-brand-cream px-2 text-brand-ink">Or continue with</span>
          </div>
        </div>

        <a
          href={`${AUTH_ROUTES.GOOGLE}?next=${encodeURIComponent(redirectedFrom || "/dashboard")}`}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-brand-seafoam/50 rounded-md shadow-sm text-sm font-medium text-brand-ink bg-white hover:bg-brand-cream focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </a>

        {!isPassword ? (
          <button
            type="button"
            onClick={() => setAuthMethod("password")}
            className="text-sm text-brand-ink/85 dark:text-brand-seafoam hover:underline"
          >
            Sign in with password instead
          </button>
        ) : null}

        {!isOtp ? (
          <button
            type="button"
            onClick={() => setAuthMethod("otp")}
            className="text-sm text-brand-ink/85 dark:text-brand-seafoam hover:underline"
          >
            Use email code instead
          </button>
        ) : null}

        {!isMagic ? (
          <button
            type="button"
            onClick={() => setAuthMethod("magic")}
            className="text-sm text-brand-ink/85 dark:text-brand-seafoam hover:underline"
          >
            Use magic link instead
          </button>
        ) : null}
      </div>
    </form>
  );
}

