"use client";

import { useActionState } from "react";
import { authFieldClassName } from "@/lib/ui/form-classes";

type SignUpAction = (previousState: { error?: string } | null | void, formData: FormData) => Promise<{ error?: string } | void | null>;

export default function SignUpForm({
  redirectedFrom,
  signUpAction,
}: {
  redirectedFrom?: string;
  signUpAction: SignUpAction;
}) {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  return (
    <form className="mt-8 space-y-6" action={formAction}>
      <input type="hidden" name="redirectedFrom" value={redirectedFrom ?? ""} />
      {state?.error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{state.error}</p>
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
            className={authFieldClassName}
            placeholder="you@example.com"
          />
        </div>

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
            autoComplete="new-password"
            required
            className={authFieldClassName}
            placeholder="••••••••"
            minLength={8}
          />
        </div>
      </div>

      <p className="text-xs text-brand-ink/70 dark:text-brand-seafoam/80">
        You will receive a confirmation link by email (not a 6-digit code). Check spam if it does
        not arrive within a few minutes.
      </p>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-brand-cream bg-brand-ink dark:bg-brand-yellow dark:text-brand-ink hover:bg-brand-teal dark:hover:bg-brand-seafoam focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Creating account..." : "Sign up"}
        </button>
      </div>
    </form>
  );
}

