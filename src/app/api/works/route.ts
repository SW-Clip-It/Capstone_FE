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

export async function GET() {
  const userId = getUserIdFromToken();

  // Join the user's bookmark status (NULL if not bookmarked or not logged in)
  const { rows } = await db.query(
    `SELECT w.*,
            CASE WHEN $1::uuid IS NULL THEN false
                 ELSE EXISTS (
                   SELECT 1 FROM work_bookmarks wb
                   WHERE wb.work_id = w.id AND wb.user_id = $1
                 )
            END AS is_bookmarked
     FROM works w
     ORDER BY w.title`,
    [userId]
  );

  return NextResponse.json(rows);
}
