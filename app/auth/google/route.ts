import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { safeRelativeNextPath } from "@/lib/auth/safe-next-path";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/config/env";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const nextPath = safeRelativeNextPath(url.searchParams.get("next"));
  const oauthRetry = url.searchParams.get("oauthRetry");
  const callbackUrl = new URL(AUTH_ROUTES.CALLBACK, url.origin);
  callbackUrl.searchParams.set("next", nextPath);
  // Marks this PKCE exchange as Google so /auth/callback can retry OAuth
  // without treating email confirmation failures as Google sign-in.
  callbackUrl.searchParams.set("authProvider", "google");
  if (oauthRetry === "1") {
    callbackUrl.searchParams.set("oauthRetry", "1");
  }

  let supabaseResponse = NextResponse.redirect(new URL(AUTH_ROUTES.SIGN_IN, url.origin));
  const cookieOptions = getSupabaseCookieOptions({
    host: url.hostname,
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
    ...(cookieOptions ? { cookieOptions } : {}),
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data?.url) {
    const signInUrl = new URL(AUTH_ROUTES.SIGN_IN, url.origin);
    signInUrl.searchParams.set("error", "oauth");
    signInUrl.searchParams.set("error_code", "google_start_failed");
    signInUrl.searchParams.set(
      "error_description",
      error?.message || "Could not start Google sign-in."
    );
    return NextResponse.redirect(signInUrl);
  }

  const redirectResponse = NextResponse.redirect(data.url);
  for (const cookie of supabaseResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

