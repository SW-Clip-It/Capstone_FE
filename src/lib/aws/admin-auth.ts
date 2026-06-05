import { cookies } from "next/headers";
import { db } from "@/lib/aws/db";

const SUPER_ADMIN = (process.env.SUPER_ADMIN_EMAIL ?? "kyumin1404@gmail.com")
  .trim()
  .toLowerCase();

interface TokenClaims {
  sub?: string;
  email?: string;
}

function readToken(): TokenClaims | null {
  const token = cookies().get("cognitoIdToken")?.value;
  if (!token) return null;
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  } catch {
    return null;
  }
}

/**
 * Async admin check used by all /api/admin routes. Admin if ANY of:
 *  1. Authorization: Bearer <ADMIN_API_KEY>     (external dev pipelines)
 *  2. logged-in user's email === SUPER_ADMIN_EMAIL
 *  3. logged-in user has role 'admin' in app_users
 */
export async function requireAdmin(request: Request): Promise<boolean> {
  // 1) Bearer key
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = process.env.ADMIN_API_KEY;
  if (expected && authHeader === `Bearer ${expected}`) return true;

  // 2) + 3) Cognito user
  const claims = readToken();
  if (!claims?.sub) return false;
  const email = (claims.email ?? "").toLowerCase();
  if (email && email === SUPER_ADMIN) return true;

  try {
    const r = await db.query(
      "SELECT role FROM app_users WHERE sub = $1 OR (email IS NOT NULL AND lower(email) = $2)",
      [claims.sub, email]
    );
    return r.rows.some((row: { role: string }) => row.role === "admin");
  } catch {
    return false;
  }
}

/** Returns the current user's admin status (for UI gating). */
export async function getMyAdminStatus(): Promise<{
  email: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}> {
  const claims = readToken();
  const email = (claims?.email ?? "").toLowerCase() || null;
  if (!claims?.sub) return { email, isAdmin: false, isSuperAdmin: false };
  const isSuperAdmin = !!email && email === SUPER_ADMIN;
  if (isSuperAdmin) return { email, isAdmin: true, isSuperAdmin: true };
  try {
    const r = await db.query(
      "SELECT role FROM app_users WHERE sub = $1 OR (email IS NOT NULL AND lower(email) = $2)",
      [claims.sub, email]
    );
    const isAdmin = r.rows.some((row: { role: string }) => row.role === "admin");
    return { email, isAdmin, isSuperAdmin: false };
  } catch {
    return { email, isAdmin: false, isSuperAdmin: false };
  }
}

export function getSuperAdminEmail() {
  return SUPER_ADMIN;
}
