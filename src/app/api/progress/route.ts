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

export async function POST(request: Request) {
  const userId = getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { work_id, chapter_id, text_block_id } = await request.json();

  await db.query(
    `INSERT INTO user_progress (user_id, work_id, chapter_id, text_block_id, last_accessed_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, work_id)
     DO UPDATE SET chapter_id = $3, text_block_id = $4, last_accessed_at = NOW()`,
    [userId, work_id, chapter_id, text_block_id]
  );

  return NextResponse.json({ success: true });
}
