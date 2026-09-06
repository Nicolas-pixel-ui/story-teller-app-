import { NextResponse } from "next/server";
import postgres from "postgres";
import {
  diagnosePostgresUrl,
  diagnoseRepairedPostgresUrl,
  getPostgresUrlRole,
  type PostgresUrlDiagnostics,
  repairPostgresConnectionUrl,
} from "@/lib/db/normalize-database-url";
import { isPoolingUrlLikelyBroken } from "@/lib/db/pooling-url-health";
import {
  getDatabaseUrlsFromRuntimeEnv,
  getRawDatabaseUrlsFromRuntimeEnv,
  isRuntimeDatabaseConfigured,
  resolveDatabaseConnectionUrl,
} from "@/lib/db/runtime-env";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { isBlogAdminUser } from "@/lib/blog/admin";

function poolingHint(
  pooling: PostgresUrlDiagnostics,
  errorMessage: string
): string {
  if (errorMessage.includes("127.0.0.1") || errorMessage.includes("ECONNREFUSED")) {
    return "POOLING_DATABASE_URL on Vercel is malformed (missing postgresql:// or truncated). Run pnpm db:copy-env-vercel pooling locally, replace the full value on Vercel, redeploy.";
  }
  if (pooling.poolerIssues.includes("wrong_port_session_pooler")) {
    return "POOLING_DATABASE_URL uses port 5432 (session pooler). In Supabase → Connect copy Transaction pooler (port 6543). The app can rewrite 5432→6543 at runtime, but you must redeploy after saving a correct URI.";
  }
  if (pooling.poolerIssues.includes("wrong_username")) {
    return "POOLING_DATABASE_URL username should be postgres.YOUR_PROJECT_REF. Copy Transaction pooler URI from Supabase Connect, or ensure NEXT_PUBLIC_SUPABASE_URL matches the same project.";
  }
  if (errorMessage.toLowerCase().includes("password authentication")) {
    return "Password rejected. In Supabase reset the database password, copy a fresh Transaction pooler URI (port 6543), update POOLING_DATABASE_URL on Vercel, redeploy.";
  }
  if (pooling.length > 0 && pooling.length !== 110) {
    return `POOLING_DATABASE_URL length is ${pooling.length} chars; a valid transaction pooler URI is usually ~110. Copy again from Supabase → Connect → Transaction pooler.`;
  }
  if (!pooling.passesUrlParse) {
    return "POOLING_DATABASE_URL cannot be parsed. Copy the full URI from Supabase (no extra quotes).";
  }
  return "Confirm Transaction pooler (port 6543) and redeploy Production after saving the env var.";
}

export const dynamic = "force-dynamic";

/** Owner-only DB probe for production debugging (no secrets in response). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isBlogAdminUser(user.id, user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { poolingUrl, databaseUrl } = getDatabaseUrlsFromRuntimeEnv();
  const { poolingRaw, databaseRaw } = getRawDatabaseUrlsFromRuntimeEnv();
  const configured = isRuntimeDatabaseConfigured();

  const poolingDiag = diagnosePostgresUrl(poolingRaw);
  const poolingRepairedDiag = diagnoseRepairedPostgresUrl(poolingRaw);
  const databaseDiag = diagnosePostgresUrl(databaseRaw);
  const repairedPooling = repairPostgresConnectionUrl(poolingRaw);
  const repairedDatabase = repairPostgresConnectionUrl(databaseRaw);
  const hasSupabasePublicUrl = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
  );
  const hasServiceRole = Boolean(getServiceRoleClient());
  const poolingBroken = isPoolingUrlLikelyBroken();

  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        hasPooling: Boolean(poolingRaw),
        hasDatabase: Boolean(databaseRaw),
        pooling: poolingDiag,
        poolingRepaired: poolingRepairedDiag,
        database: databaseDiag,
        hint: "Set POOLING_DATABASE_URL on Vercel (Production scope), then redeploy.",
        poolingBroken,
        hasServiceRole,
      },
      { status: 503 }
    );
  }

  const url = resolveDatabaseConnectionUrl()!;
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 8 });
  try {
    const [{ ok }] = await sql`SELECT 1 AS ok`;
    return NextResponse.json({
      ok: ok === 1,
      configured: true,
      connected: ok === 1,
      usesPooling: Boolean(poolingUrl),
      hasSupabasePublicUrl,
      repairedUserRole: getPostgresUrlRole(repairedPooling),
      pooling: poolingDiag,
      poolingRepaired: poolingRepairedDiag,
      database: databaseDiag,
      repaired: {
        pooling: Boolean(repairedPooling),
        database: Boolean(repairedDatabase),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        connected: false,
        usesPooling: Boolean(poolingUrl),
        hasSupabasePublicUrl,
        repairedUserRole: getPostgresUrlRole(repairedPooling),
        error: message.slice(0, 200),
        pooling: poolingDiag,
        poolingRepaired: poolingRepairedDiag,
        database: databaseDiag,
        repaired: {
          pooling: Boolean(repairedPooling),
          database: Boolean(repairedDatabase),
        },
        hint: poolingHint(poolingRepairedDiag, message),
        poolingBroken,
        hasServiceRole,
        fix: poolingBroken
          ? "Delete POOLING_DATABASE_URL on Vercel, run: pnpm db:copy-env-vercel pooling — paste full ~110 char URI, redeploy. Optional: add SUPABASE_SERVICE_ROLE_KEY so the app can read data until the pooler URL is fixed."
          : undefined,
      },
      { status: 503 }
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
