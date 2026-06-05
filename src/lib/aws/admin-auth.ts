import { cookies } from "next/headers";

/**
 * Admin authorization — accepts EITHER:
 *  1. `Authorization: Bearer <ADMIN_API_KEY>`  → for external developers
 *     (LLM / video pipelines hitting the API programmatically).
 *  2. A logged-in Cognito user whose email is in `ADMIN_EMAILS`
 *     (comma-separated) → for the web admin UI at /admin.
 *
 * Returns the auth mode, or null if unauthorized.
 */
export function getAdminAuth(request: Request): "api-key" | "user" | null {
  // 1) Bearer API key
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = process.env.ADMIN_API_KEY;
  if (expected && authHeader === `Bearer ${expected}`) {
    return "api-key";
  }

  // 2) Admin Cognito user (cookie → JWT → email)
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const token = cookies().get("cognitoIdToken")?.value;
  if (token) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      const email = String(payload.email ?? "").toLowerCase();
      // If no ADMIN_EMAILS configured, any logged-in user is treated as admin
      // (single-user capstone default). Lock down by setting ADMIN_EMAILS.
      if (email && (adminEmails.length === 0 || adminEmails.includes(email))) {
        return "user";
      }
    } catch {
      /* ignore malformed token */
    }
  }

  return null;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) return true; // default open for single-user
  return !!email && adminEmails.includes(email.toLowerCase());
}
