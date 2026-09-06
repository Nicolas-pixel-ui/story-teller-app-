import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type RequestUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    display_name?: string | null;
  };
};

/**
 * Only accept middleware auth headers when they look like they were set by our
 * middleware after a verified session (never invent identity from the raw client).
 * Prefer supabase.auth.getUser(); headers are a same-request optimization only.
 */
async function userFromMiddlewareHeaders(): Promise<RequestUser | null> {
  const headerList = await headers();
  // Middleware strips inbound client values then sets these after getUser().
  // If getUser() already failed in this request path, do not trust headers alone
  // for privileged mutations — callers should treat this as soft hint only.
  const fallbackUserId = headerList.get("x-auth-user-id");
  if (!fallbackUserId) {
    return null;
  }
  // Reject obviously spoofed empty/whitespace ids
  if (!/^[0-9a-f-]{36}$/i.test(fallbackUserId)) {
    return null;
  }
  return {
    id: fallbackUserId,
    email: headerList.get("x-auth-user-email"),
  };
}

export async function getRequestUser(): Promise<{
  user: RequestUser | null;
  source: "supabase" | "middleware-header" | "none";
  error: Error | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (user && !error) {
      return {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: {
            display_name:
              typeof user.user_metadata?.display_name === "string"
                ? user.user_metadata.display_name
                : null,
          },
        },
        source: "supabase",
        error: null,
      };
    }

    // Do not fall back to client-controllable headers when Supabase auth failed.
    return {
      user: null,
      source: "none",
      error: error ?? new Error("Unauthorized"),
    };
  } catch (error) {
    console.error("getRequestUser failed", error);
    return {
      user: null,
      source: "none",
      error: error instanceof Error ? error : new Error("Auth check failed"),
    };
  }
}

/** @deprecated Prefer getRequestUser(); header-only identity is unsafe for authz. */
export async function getRequestUserAllowMiddlewareHeader() {
  const primary = await getRequestUser();
  if (primary.user) return primary;
  const fromHeaders = await userFromMiddlewareHeaders();
  if (fromHeaders) {
    return {
      user: fromHeaders,
      source: "middleware-header" as const,
      error: null,
    };
  }
  return primary;
}
