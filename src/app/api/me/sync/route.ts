import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/aws/db";
import { getSuperAdminEmail } from "@/lib/aws/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/sync
 * Upserts the currently logged-in Cognito user into `app_users` (so the admin
 * user-management page can see everyone who has signed in). Called by the
 * AuthProvider after each successful auth refresh.
 */
export async function POST() {
  const token = cookies().get("cognitoIdToken")?.value;
  if (!token) return NextResponse.json({ ok: false });
  let claims: { sub?: string; email?: string };
  try {
    claims = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  } catch {
    return NextResponse.json({ ok: false });
  }
  if (!claims.sub) return NextResponse.json({ ok: false });

  const email = (claims.email ?? "").toLowerCase() || null;
  const isSuper = !!email && email === getSuperAdminEmail();

  try {
    // Merge any placeholder/previous row with the same email into this sub.
    if (email) {
      await db.query(
        "UPDATE app_users SET sub = $1 WHERE lower(email) = $2 AND sub <> $1",
        [claims.sub, email]
      );
    }
    await db.query(
      `INSERT INTO app_users (sub, email, role, last_seen)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (sub) DO UPDATE
         SET email = EXCLUDED.email, last_seen = now()
         ${isSuper ? ", role = 'admin'" : ""}`,
      [claims.sub, email, isSuper ? "admin" : "user"]
    );
  } catch {
    /* non-fatal */
  }
  return NextResponse.json({ ok: true });
}
