import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isAuthDebugEnabled } from "@/lib/auth/debug";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { safeRelativeNextPath } from "@/lib/auth/safe-next-path";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/config/env";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { ensureUserProfileFromAuthUser } from "@/lib/users/ensure-profile";
import type { EmailOtpType } from "@supabase/supabase-js";

const DEFAULT_NEXT = "/dashboard";
function setAuthDebugHeader(response: NextResponse, key: string, value: string | boolean) {
  if (!isAuthDebugEnabled()) return;
  response.headers.set(`x-auth-debug-${key}`, String(value));
}

function isEmailOtpType(value: string): value is EmailOtpType {
  return [
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
  ].includes(value);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");
  const oauthRetry = url.searchParams.get("oauthRetry") === "1";
  const authProvider = url.searchParams.get("authProvider");
  const isGoogleOAuth = authProvider === "google";
  const safeNext = safeRelativeNextPath(url.searchParams.get("next"));
  const destination = new URL(safeNext, url.origin);

  if (destination.origin !== url.origin) {
    return NextResponse.redirect(new URL(DEFAULT_NEXT, url.origin));
  }

  const redirectSignInError = (
    error: string,
    errorCode?: string | null,
    errorDescription?: string | null,
    extras?: { method?: string; signup?: string }
  ) => {
    const signInUrl = new URL(AUTH_ROUTES.SIGN_IN, url.origin);
    signInUrl.searchParams.set("error", error);
    signInUrl.searchParams.set("method", extras?.method ?? "password");
    if (extras?.signup) signInUrl.searchParams.set("signup", extras.signup);
    if (errorCode) signInUrl.searchParams.set("error_code", errorCode);
    if (errorDescription) signInUrl.searchParams.set("error_description", errorDescription);
    return NextResponse.redirect(signInUrl);
  };

  if (!code && !(tokenHash && otpType && isEmailOtpType(otpType))) {
    const errorResponse = redirectSignInError("oauth");
    setAuthDebugHeader(errorResponse, "callback-host", url.host);
    setAuthDebugHeader(errorResponse, "callback-code-present", false);
    setAuthDebugHeader(errorResponse, "callback-token-hash-present", Boolean(tokenHash));
    setAuthDebugHeader(errorResponse, "callback-otp-type", otpType || "none");
    return errorResponse;
  }

  const response = NextResponse.redirect(destination);
  const hasSupabaseCookieInRequest = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("sb-"));
  setAuthDebugHeader(response, "callback-host", url.host);
  setAuthDebugHeader(response, "callback-next", safeNext);
  setAuthDebugHeader(response, "callback-code-present", true);
  setAuthDebugHeader(response, "request-had-sb-cookie", hasSupabaseCookieInRequest);

  const cookieOptions = getSupabaseCookieOptions({
    host: url.hostname,
  });
  setAuthDebugHeader(response, "cookie-domain", cookieOptions?.domain || "host-only");

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
      ...(cookieOptions ? { cookieOptions } : {}),
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const lower = error.message.toLowerCase();
      const isPkceMissing = lower.includes("pkce code verifier not found");
      // Only restart Google OAuth for Google-started PKCE flows. Email
      // confirmation / magic-link PKCE misses should send users to sign-in.
      if (isPkceMissing && isGoogleOAuth && !oauthRetry) {
        const restartUrl = new URL(AUTH_ROUTES.GOOGLE, url.origin);
        restartUrl.searchParams.set("next", safeNext);
        restartUrl.searchParams.set("oauthRetry", "1");
        const retryResponse = NextResponse.redirect(restartUrl);
        setAuthDebugHeader(retryResponse, "callback-host", url.host);
        setAuthDebugHeader(retryResponse, "exchange-error", true);
        setAuthDebugHeader(retryResponse, "exchange-restarted-oauth", true);
        return retryResponse;
      }
      if (isPkceMissing && !isGoogleOAuth) {
        const signInUrl = new URL(AUTH_ROUTES.SIGN_IN, url.origin);
        signInUrl.searchParams.set("method", "password");
        signInUrl.searchParams.set("signup", "confirmed");
        const confirmedResponse = NextResponse.redirect(signInUrl);
        setAuthDebugHeader(confirmedResponse, "callback-host", url.host);
        setAuthDebugHeader(confirmedResponse, "exchange-error", true);
        setAuthDebugHeader(confirmedResponse, "exchange-message", error.message);
        setAuthDebugHeader(confirmedResponse, "password-recovery", true);
        return confirmedResponse;
      }
      const errorResponse = redirectSignInError("oauth", "exchange_failed", error.message);
      setAuthDebugHeader(errorResponse, "callback-host", url.host);
      setAuthDebugHeader(errorResponse, "exchange-error", true);
      setAuthDebugHeader(errorResponse, "exchange-message", error.message);
      setAuthDebugHeader(errorResponse, "auth-provider", authProvider || "unknown");
      return errorResponse;
    }
  } else if (tokenHash && otpType && isEmailOtpType(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) {
      const errorResponse = redirectSignInError("otp", "otp_expired", error.message);
      setAuthDebugHeader(errorResponse, "callback-host", url.host);
      setAuthDebugHeader(errorResponse, "verify-otp-error", true);
      setAuthDebugHeader(errorResponse, "verify-otp-message", error.message);
      return errorResponse;
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await ensureUserProfileFromAuthUser(user);

  const wroteSupabaseCookie = response.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("sb-"));
  setAuthDebugHeader(response, "wrote-sb-cookie", wroteSupabaseCookie);

  return response;
}
