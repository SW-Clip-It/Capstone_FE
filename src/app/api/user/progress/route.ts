import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/aws/db";

export const dynamic = "force-dynamic";

function getUserIdFromToken(): string | null {
  const cookieStore = cookies();
  const token = cookieStore.get("cognitoIdToken")?.value;
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

export async function GET() {
  const userId = getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await db.query(
    `SELECT up.*, row_to_json(w.*) AS work
     FROM user_progress up
     JOIN works w ON w.id = up.work_id
     WHERE up.user_id = $1
     ORDER BY up.last_accessed_at DESC
     LIMIT 10`,
    [userId]
  );

  return NextResponse.json(rows);
}
