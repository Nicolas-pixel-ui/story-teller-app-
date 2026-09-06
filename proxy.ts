import { type NextRequest, NextResponse } from "next/server";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * OAuth root callback: send the browser to `/auth/callback` on the **same host** that received
 * `?code=`, so PKCE verifier cookies match the exchange (see docs/oauth-callback-production.md).
 */
function redirectUrlForOAuthRootCode(request: NextRequest): URL | null {
  const url = request.nextUrl;
  if (url.pathname !== "/" || !url.searchParams.has("code")) {
    return null;
  }

  const search = url.search;
  const forwarded = request.headers.get("x-forwarded-host");
  const hostHeader =
    forwarded?.split(",")[0]?.trim() || request.headers.get("host") || "";
  if (!hostHeader) {
    const fallback = url.clone();
    fallback.pathname = AUTH_ROUTES.CALLBACK;
    return fallback;
  }

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  return new URL(`${AUTH_ROUTES.CALLBACK}${search}`, `${proto}://${hostHeader}`);
}

export async function proxy(request: NextRequest) {
  try {
    // Handle OAuth on `/` before session refresh. Do not apex↔www redirect here — that breaks
    // PKCE/session cookies when combined with Vercel domain redirects (see docs/oauth-callback-production.md).
    const oauthRedirect = redirectUrlForOAuthRootCode(request);
    if (oauthRedirect) {
      return NextResponse.redirect(oauthRedirect);
    }

    return await updateSession(request);
  } catch (error) {
    console.error("[PROXY][MIDDLEWARE_FAILED]", error);
    const pathname = request.nextUrl.pathname;
    const safeHeaders = new Headers(request.headers);
    safeHeaders.delete("x-auth-user-id");
    safeHeaders.delete("x-auth-user-email");

    const isLikelyPublic =
      pathname === "/" ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/blog") ||
      pathname.startsWith("/blogs") ||
      pathname.startsWith("/feedback") ||
      pathname.startsWith("/support");

    if (!isLikelyPublic && !request.headers.get("next-action")) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized", status: 401 }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = AUTH_ROUTES.SIGN_IN;
      url.searchParams.set("reason", "proxy-error");
      return NextResponse.redirect(url);
    }

    return NextResponse.next({
      request: {
        headers: safeHeaders,
      },
    });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
