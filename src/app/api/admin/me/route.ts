import { NextResponse } from "next/server";
import { getMyAdminStatus } from "@/lib/aws/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/me → { email, isAdmin, isSuperAdmin }
// Any logged-in user can check their own admin status (used to gate the UI).
export async function GET() {
  const status = await getMyAdminStatus();
  return NextResponse.json(status);
}
