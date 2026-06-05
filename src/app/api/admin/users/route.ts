import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";
import { requireAdmin, getSuperAdminEmail } from "@/lib/aws/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/users → list all known users with roles
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { rows } = await db.query(
    `SELECT sub, email, role, first_seen, last_seen
     FROM app_users
     ORDER BY (role = 'admin') DESC, last_seen DESC NULLS LAST`
  );
  const superEmail = getSuperAdminEmail();
  return NextResponse.json(
    rows.map((r: any) => ({
      ...r,
      is_super: (r.email ?? "").toLowerCase() === superEmail,
      pending: String(r.sub).startsWith("pending:"),
    }))
  );
}

// POST /api/admin/users  { email, role }  → grant/revoke admin
// (Granting by email works even before the user has logged in.)
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role;
  if (!email || (role !== "admin" && role !== "user")) {
    return NextResponse.json(
      { error: "email and role ('admin'|'user') required" },
      { status: 400 }
    );
  }
  if (email === getSuperAdminEmail()) {
    return NextResponse.json(
      { error: "슈퍼 관리자는 변경할 수 없습니다" },
      { status: 400 }
    );
  }

  const upd = await db.query(
    "UPDATE app_users SET role = $1 WHERE lower(email) = $2 RETURNING sub",
    [role, email]
  );
  if (!upd.rows.length) {
    // user hasn't logged in yet — create a placeholder so the grant applies
    // as soon as they sign in (the sync merges it to their real sub).
    await db.query(
      "INSERT INTO app_users (sub, email, role) VALUES ($1, $2, $3)",
      [`pending:${email}`, email, role]
    );
  }
  return NextResponse.json({ ok: true, email, role });
}

// DELETE /api/admin/users?email=...  (remove a tracked user row)
export async function DELETE(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = (new URL(request.url).searchParams.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (email === getSuperAdminEmail()) {
    return NextResponse.json(
      { error: "슈퍼 관리자는 삭제할 수 없습니다" },
      { status: 400 }
    );
  }
  await db.query("DELETE FROM app_users WHERE lower(email) = $1", [email]);
  return NextResponse.json({ ok: true });
}
