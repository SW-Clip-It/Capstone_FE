import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";
import { requireAdmin, getSuperAdminEmail } from "@/lib/aws/admin-auth";
import {
  listCognitoUsers,
  deleteCognitoUser,
  setCognitoUserEnabled,
} from "@/lib/aws/cognito-admin";

export const dynamic = "force-dynamic";

// GET /api/admin/users → ALL registered (Cognito) users, merged with roles.
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const superEmail = getSuperAdminEmail();

  // roles from app_users
  const { rows: roleRows } = await db.query(
    "SELECT lower(email) AS email, role FROM app_users WHERE email IS NOT NULL"
  );
  const roleByEmail = new Map<string, string>(
    roleRows.map((r: any) => [r.email, r.role])
  );

  try {
    const cognito = await listCognitoUsers();
    const users = cognito.map((u) => {
      const email = (u.email ?? "").toLowerCase();
      const isSuper = email === superEmail;
      return {
        username: u.username,
        sub: u.sub,
        email: u.email,
        status: u.status,
        enabled: u.enabled,
        created: u.created,
        role: isSuper ? "admin" : roleByEmail.get(email) ?? "user",
        is_super: isSuper,
      };
    });
    // admins first, then by email
    users.sort(
      (a, b) =>
        (b.role === "admin" ? 1 : 0) - (a.role === "admin" ? 1 : 0) ||
        (a.email ?? "").localeCompare(b.email ?? "")
    );
    return NextResponse.json({ source: "cognito", users });
  } catch (e: any) {
    // Fallback: app_users only (e.g. missing cognito-idp permission)
    const { rows } = await db.query(
      "SELECT sub, email, role, last_seen FROM app_users ORDER BY (role='admin') DESC"
    );
    return NextResponse.json({
      source: "app_users",
      error: e.message,
      users: rows.map((r: any) => ({
        username: r.sub,
        sub: r.sub,
        email: r.email,
        status: "",
        enabled: true,
        created: null,
        role: (r.email ?? "").toLowerCase() === superEmail ? "admin" : r.role,
        is_super: (r.email ?? "").toLowerCase() === superEmail,
      })),
    });
  }
}

// POST /api/admin/users  { email, role }   → grant/revoke admin
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
    await db.query(
      "INSERT INTO app_users (sub, email, role) VALUES ($1, $2, $3)",
      [`pending:${email}`, email, role]
    );
  }
  return NextResponse.json({ ok: true, email, role });
}

// DELETE /api/admin/users?username=...&email=...
//  - deletes the Cognito account (회원 삭제) and any app_users row
//  - or ?action=disable / ?action=enable to toggle account
export async function DELETE(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const username = url.searchParams.get("username");
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const action = url.searchParams.get("action"); // delete | disable | enable

  if (email && email === getSuperAdminEmail()) {
    return NextResponse.json(
      { error: "슈퍼 관리자는 변경/삭제할 수 없습니다" },
      { status: 400 }
    );
  }
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  try {
    if (action === "disable") {
      await setCognitoUserEnabled(username, false);
    } else if (action === "enable") {
      await setCognitoUserEnabled(username, true);
    } else {
      // hard delete
      await deleteCognitoUser(username);
      if (email) {
        await db.query("DELETE FROM app_users WHERE lower(email) = $1", [email]);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
