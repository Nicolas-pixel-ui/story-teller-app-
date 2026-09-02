import { SITE_OWNER_EMAIL } from "./owner-email";

/**
 * Owner/test accounts hidden from the usage admin dashboard so the numbers
 * reflect real users only. Compared case-insensitively.
 */
export const USAGE_METRICS_EXCLUDED_EMAILS: readonly string[] = [
  SITE_OWNER_EMAIL,
  "nicolashartmann0205@gmail.com",
].map((email) => email.trim().toLowerCase());

export function isExcludedFromUsageMetrics(email: string | null | undefined): boolean {
  if (!email) return false;
  return USAGE_METRICS_EXCLUDED_EMAILS.includes(email.trim().toLowerCase());
}
