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

export async function GET(request: Request) {
  const userId = getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?notesOnly=true → only bookmarks that have a note (i.e. user-written notes)
  const url = new URL(request.url);
  const notesOnly = url.searchParams.get("notesOnly") === "true";

  const filterClause = notesOnly
    ? "AND b.note IS NOT NULL AND b.note <> ''"
    : "";

  const { rows } = await db.query(
    `SELECT b.id, b.note, b.created_at,
            json_build_object(
              'id', tb.id,
              'content', tb.content,
              'content_ko', tb.content_ko,
              'chapter', json_build_object(
                'id', ch.id,
                'title', ch.title,
                'title_ko', ch.title_ko,
                'work_id', ch.work_id,
                'work', json_build_object(
                  'id', w.id,
                  'title', w.title,
                  'title_ko', w.title_ko
                )
              )
            ) AS text_block
     FROM bookmarks b
     JOIN text_blocks tb ON tb.id = b.text_block_id
     JOIN chapters ch ON ch.id = tb.chapter_id
     JOIN works w ON w.id = ch.work_id
     WHERE b.user_id = $1 ${filterClause}
     ORDER BY b.created_at DESC`,
    [userId]
  );

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const userId = getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text_block_id, note } = await request.json();
  if (!text_block_id) {
    return NextResponse.json(
      { error: "text_block_id required" },
      { status: 400 }
    );
  }

  const { rows } = await db.query(
    `INSERT INTO bookmarks (user_id, text_block_id, note)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, text_block_id) DO UPDATE
       SET note = EXCLUDED.note
     RETURNING *`,
    [userId, text_block_id, note ?? null]
  );

  return NextResponse.json(rows[0]);
}

export async function DELETE(request: Request) {
  const userId = getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const textBlockId = url.searchParams.get("text_block_id");
  if (!textBlockId) {
    return NextResponse.json(
      { error: "text_block_id required" },
      { status: 400 }
    );
  }

  await db.query(
    "DELETE FROM bookmarks WHERE user_id = $1 AND text_block_id = $2",
    [userId, textBlockId]
  );

  return NextResponse.json({ ok: true });
}
