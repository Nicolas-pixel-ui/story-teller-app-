/** Rethrow Next.js `redirect()` from server actions so client handlers do not treat it as failure. */
export function isNextRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: string }).digest;
  return typeof digest === "string" && digest.includes("NEXT_REDIRECT");
}

export function rethrowIfRedirect(error: unknown): never | void {
  if (isNextRedirectError(error)) {
    throw error;
  }
}
