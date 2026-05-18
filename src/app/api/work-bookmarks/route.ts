import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/aws/db";

export const dynamic = "force-dynamic";

function getUserIdFromToken(): string | null {
  const token = cookies().get("cognitoIdToken")?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    return payload.sub;
  } catch {
    return null;
  }
}

// GET /api/work-bookmarks
// Returns this user's bookmarked works (with full work row joined).
export async function GET() {
  const userId = getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await db.query(
    `SELECT wb.id, wb.created_at, row_to_json(w.*) AS work
     FROM work_bookmarks wb
     JOIN works w ON w.id = wb.work_id
     WHERE wb.user_id = $1
     ORDER BY wb.created_at DESC`,
    [userId]
  );

  return NextResponse.json(rows);
}

// POST /api/work-bookmarks  { work_id }
export async function POST(request: Request) {
  const userId = getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { work_id } = await request.json();
  if (!work_id) {
    return NextResponse.json({ error: "work_id required" }, { status: 400 });
  }

  const { rows } = await db.query(
    `INSERT INTO work_bookmarks (user_id, work_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, work_id) DO NOTHING
     RETURNING *`,
    [userId, work_id]
  );

  return NextResponse.json(rows[0] ?? { ok: true });
}

// DELETE /api/work-bookmarks?work_id=...
export async function DELETE(request: Request) {
  const userId = getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workId = new URL(request.url).searchParams.get("work_id");
  if (!workId) {
    return NextResponse.json({ error: "work_id required" }, { status: 400 });
  }
  await db.query(
    "DELETE FROM work_bookmarks WHERE user_id = $1 AND work_id = $2",
    [userId, workId]
  );
  return NextResponse.json({ ok: true });
}
