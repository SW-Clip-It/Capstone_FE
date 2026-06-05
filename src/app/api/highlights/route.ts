import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/aws/db";

export const dynamic = "force-dynamic";

function userId(): string | null {
  const token = cookies().get("cognitoIdToken")?.value;
  if (!token) return null;
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString()).sub;
  } catch {
    return null;
  }
}

// POST /api/highlights
// Body: { ranges: [{ text_block_id, start_offset, end_offset }] }
// Saves one or more per-block character ranges for the dragged selection.
export async function POST(request: Request) {
  const uid = userId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const ranges = Array.isArray(body.ranges) ? body.ranges : [];
  if (ranges.length === 0) {
    return NextResponse.json({ error: "ranges required" }, { status: 400 });
  }

  const created: any[] = [];
  for (const r of ranges) {
    if (
      !r.text_block_id ||
      typeof r.start_offset !== "number" ||
      typeof r.end_offset !== "number" ||
      r.end_offset <= r.start_offset
    )
      continue;
    const res = await db.query(
      `INSERT INTO highlights (user_id, text_block_id, start_offset, end_offset)
       VALUES ($1, $2, $3, $4)
       RETURNING id, text_block_id, start_offset, end_offset`,
      [uid, r.text_block_id, r.start_offset, r.end_offset]
    );
    created.push(res.rows[0]);
  }
  return NextResponse.json({ ok: true, highlights: created });
}

// DELETE /api/highlights?id=...   (remove one highlight)
export async function DELETE(request: Request) {
  const uid = userId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.query("DELETE FROM highlights WHERE id = $1 AND user_id = $2", [
    id,
    uid,
  ]);
  return NextResponse.json({ ok: true });
}
