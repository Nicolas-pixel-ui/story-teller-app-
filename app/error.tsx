"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full space-y-4 rounded-xl border border-brand-seafoam/30 bg-white/95 p-8 shadow-sm dark:border-brand-seafoam/20 dark:bg-brand-ink/85 text-center">
        <h1 className="text-xl font-semibold text-brand-ink dark:text-brand-yellow">
          Something went wrong
        </h1>
        <p className="text-sm text-brand-ink/80 dark:text-brand-seafoam">
          This page hit an error while loading. You can retry, or go back to the home page.
        </p>
        {error.digest ? (
          <p className="text-xs text-brand-ink/60 dark:text-brand-seafoam/80">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-brand-ink px-4 py-2 text-sm font-medium text-white dark:bg-brand-yellow dark:text-brand-ink"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-brand-seafoam/50 px-4 py-2 text-sm font-medium text-brand-ink dark:text-brand-seafoam"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
