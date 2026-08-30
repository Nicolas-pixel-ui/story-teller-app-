import type { CookieOptions } from "@supabase/ssr";

function isLocalOrPreviewHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.endsWith(".vercel.app")) return true;
  return false;
}

function normalizeLeadingDotDomain(raw: string): string {
  const trimmed = raw.trim();
  const withoutDot = trimmed.startsWith(".") ? trimmed.slice(1) : trimmed;
  return `.${withoutDot}`;
}

function hostnameFromContext(context?: { host?: string }): string | undefined {
  const host = context?.host?.trim();
  if (!host) return undefined;
  return host.split(":")[0]?.toLowerCase();
}

/** Known production hosts — always share cookies across apex + www. */
function productionCookieDomainForHost(hostname: string): string | undefined {
  const h = hostname.toLowerCase();
  if (h === "storyinthemaking.com" || h === "www.storyinthemaking.com") {
    return ".storyinthemaking.com";
  }
  return undefined;
}

/**
 * Shared cookie domain for apex + www (e.g. `.storyinthemaking.com`).
 * Prefers explicit AUTH_COOKIE_DOMAIN, then known production host, then NEXT_PUBLIC_APP_URL / request host.
 */
function resolveSharedDomain(context?: { host?: string }): string | undefined {
  const explicit = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (explicit) {
    return normalizeLeadingDotDomain(explicit);
  }

  const requestHost = hostnameFromContext(context);
  if (requestHost) {
    const knownProduction = productionCookieDomainForHost(requestHost);
    if (knownProduction) {
      return knownProduction;
    }
  }

  const hostnames: string[] = [];

  const rawApp = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (rawApp) {
    try {
      const normalized = /^https?:\/\//i.test(rawApp) ? rawApp : `https://${rawApp}`;
      hostnames.push(new URL(normalized).hostname);
    } catch {
      // ignore invalid env
    }
  }

  const requestHostForFallback = hostnameFromContext(context);
  if (requestHostForFallback) {
    hostnames.push(requestHostForFallback);
  }

  for (const hostname of hostnames) {
    if (!hostname || isLocalOrPreviewHost(hostname)) continue;
    const base = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
    return normalizeLeadingDotDomain(base);
  }

  return undefined;
}

export type SupabaseCookieContext = {
  /** Request hostname, e.g. from `NextRequest` — used in middleware / route handlers */
  host?: string;
};

/** Keep refresh-token cookies after the browser is closed (~400 days). */
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

function resolveRequestHost(context?: SupabaseCookieContext): string | undefined {
  return (
    context?.host ??
    (typeof window !== "undefined" ? window.location.hostname : undefined)
  );
}

function isHttpsContext(host?: string): boolean {
  if (typeof window !== "undefined") {
    return window.location.protocol === "https:";
  }
  if (!host) return process.env.NODE_ENV === "production";
  return !isLocalOrPreviewHost(host);
}

/**
 * Returns Supabase SSR `cookieOptions` so session cookies persist and work on both apex and www.
 *
 * Skips shared domain on localhost, Vercel preview hosts, or when `VERCEL_ENV` is not
 * `production` (server). In the browser, `host` defaults to `window.location.hostname`.
 */
export function getSupabaseCookieOptions(
  context?: SupabaseCookieContext
): CookieOptions {
  const host = resolveRequestHost(context);
  const skipSharedDomain =
    Boolean(host && isLocalOrPreviewHost(host)) ||
    (process.env.VERCEL === "1" &&
      process.env.VERCEL_ENV !== "production" &&
      (!host || !productionCookieDomainForHost(host)));

  const base: CookieOptions = {
    path: "/",
    sameSite: "lax",
    secure: isHttpsContext(host),
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  };

  if (skipSharedDomain) {
    return base;
  }

  const domain = resolveSharedDomain(context);
  if (!domain) {
    return base;
  }

  return {
    ...base,
    secure: true,
    domain,
  };
}
