import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthDebugEnabled } from "@/lib/auth/debug";
import { AUTH_ROUTE_PREFIX, AUTH_ROUTES } from "@/lib/auth/routes";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/config/env";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

// Public routes that are accessible to everyone (blog is public marketing content)
const publicRoutes = [
  "/",
  AUTH_ROUTES.SIGN_IN,
  AUTH_ROUTES.SIGN_UP,
  AUTH_ROUTES.CALLBACK,
  AUTH_ROUTES.GOOGLE,
];
function setAuthDebugHeader(response: NextResponse, key: string, value: string | boolean) {
  if (!isAuthDebugEnabled()) return;
  response.headers.set(`x-auth-debug-${key}`, String(value));
}

// Check if a path is a public route
function isPublicRoute(pathname: string): boolean {
  if (
    pathname === "/blog" ||
    pathname.startsWith("/blog/") ||
    pathname === "/blogs" ||
    pathname.startsWith("/blogs/") ||
    pathname === "/feedback" ||
    pathname.startsWith("/feedback/")
  ) {
    return true;
  }
  if (pathname === "/support" || pathname.startsWith("/support/")) {
    return true;
  }
  if (pathname === "/support-agent" || pathname.startsWith("/support-agent/")) {
    return true;
  }
  if (pathname === "/api/health/db") {
    return true;
  }
  return publicRoutes.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(route);
  });
}

/**
 * Preserve refreshed Supabase session cookies when returning a redirect.
 * Next.js middleware may serialize cookies to `x-middleware-set-cookie`; copy that plus re-apply cookies.
 */
function redirectWithSessionCookies(url: URL, supabaseResponse: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  const serialized = supabaseResponse.headers.get("x-middleware-set-cookie");
  if (serialized) {
    redirectResponse.headers.set("x-middleware-set-cookie", serialized);
  }
  for (const cookie of supabaseResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  setAuthDebugHeader(redirectResponse, "redirect-to", url.pathname);
  setAuthDebugHeader(
    redirectResponse,
    "redirect-carried-sb-cookie",
    redirectResponse.cookies.getAll().some((cookie) => cookie.name.includes("sb-"))
  );
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const isAuthRoute = pathname.startsWith(AUTH_ROUTE_PREFIX);
    const requestHadSbCookie = request.cookies
      .getAll()
      .some((cookie) => cookie.name.includes("sb-"));
    if (pathname.startsWith(AUTH_ROUTES.CALLBACK) || pathname.startsWith(AUTH_ROUTES.GOOGLE)) {
      const passthrough = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });
      setAuthDebugHeader(passthrough, "auth-bypass-route", pathname);
      return passthrough;
    }

    const requestHeaders = new Headers(request.headers);
    let supabaseResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    const cookieOptions = getSupabaseCookieOptions({
      host: request.nextUrl.hostname,
    });
    setAuthDebugHeader(supabaseResponse, "request-host", request.nextUrl.host);
    setAuthDebugHeader(supabaseResponse, "request-path", request.nextUrl.pathname);
    setAuthDebugHeader(supabaseResponse, "cookie-domain", cookieOptions?.domain || "host-only");
    setAuthDebugHeader(supabaseResponse, "request-had-sb-cookie", requestHadSbCookie);

    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
        ...(cookieOptions ? { cookieOptions } : {}),
      }
    );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

    const {
      data: { user: userFromGetUser },
      error: getUserError,
    } = await supabase.auth.getUser();

  // Immediately after auth redirects, cookie/session propagation can race one request
  // behind getUser(). Fall back to getSession() to avoid bouncing valid sign-ins.
    let user = userFromGetUser;
    let usedSessionFallback = false;
    if (!user) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        user = session.user;
        usedSessionFallback = true;
      }
    }
    

    const isPublic = isPublicRoute(pathname);
    if (user) {
      requestHeaders.set("x-auth-user-id", user.id);
      requestHeaders.set("x-auth-user-email", user.email ?? "");
    } else {
      requestHeaders.delete("x-auth-user-id");
      requestHeaders.delete("x-auth-user-email");
    }
    setAuthDebugHeader(supabaseResponse, "is-public-route", isPublic);
    setAuthDebugHeader(supabaseResponse, "is-auth-route", isAuthRoute);
    setAuthDebugHeader(supabaseResponse, "user-present", Boolean(user));
    setAuthDebugHeader(supabaseResponse, "get-user-error", Boolean(getUserError));
    setAuthDebugHeader(supabaseResponse, "used-session-fallback", usedSessionFallback);
    setAuthDebugHeader(
      supabaseResponse,
      "auth-route-cookie-user-mismatch",
      isAuthRoute && requestHadSbCookie && !user
    );

  // Server Action POSTs use the `next-action` header. Middleware redirects (302 HTML)
  // break the client, which expects `text/x-component` or `x-action-redirect`.
    if (request.headers.get("next-action")) {
      setAuthDebugHeader(supabaseResponse, "next-action", true);
      return supabaseResponse;
    }

  // If user is authenticated and trying to access auth pages, redirect to main app.
  // Never redirect away from /auth/callback — OAuth needs this route to exchange ?code= even if a session exists.
    if (
      user &&
      pathname.startsWith(AUTH_ROUTE_PREFIX) &&
      !pathname.startsWith(AUTH_ROUTES.CALLBACK)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return redirectWithSessionCookies(url, supabaseResponse);
    }

  // If user is not authenticated and trying to access protected route, redirect to sign-in
    if (!user && !isPublic) {
      if (pathname.startsWith("/api/")) {
        const unauthorized = NextResponse.json(
          { error: "Unauthorized", status: 401 },
          { status: 401 }
        );
        for (const cookie of supabaseResponse.cookies.getAll()) {
          unauthorized.cookies.set(cookie);
        }
        return unauthorized;
      }
      const url = request.nextUrl.clone();
      url.pathname = AUTH_ROUTES.SIGN_IN;
      url.searchParams.set("redirectedFrom", pathname);
      return redirectWithSessionCookies(url, supabaseResponse);
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    const serialized = supabaseResponse.headers.get("x-middleware-set-cookie");
    if (serialized) {
      response.headers.set("x-middleware-set-cookie", serialized);
    }
    for (const cookie of supabaseResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
    if (isAuthDebugEnabled()) {
      for (const [name, value] of supabaseResponse.headers.entries()) {
        if (name.startsWith("x-auth-debug-")) {
          response.headers.set(name, value);
        }
      }
    }
    

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    supabaseResponse.cookies.getAll().forEach((c) => myNewResponse.cookies.set(c))
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

    return response;
  } catch (error) {
    console.error("[MIDDLEWARE][UPDATE_SESSION_FAILED]", error);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

