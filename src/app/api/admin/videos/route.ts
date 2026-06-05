import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";
import { getAdminAuth } from "@/lib/aws/admin-auth";

export const dynamic = "force-dynamic";

// POST /api/admin/videos
// Register an uploaded video to a scene. Two ways to identify the block:
//   { slug, chapter, scene, storage_path }      ← by chapter/scene (recommended)
//   { text_block_id, storage_path }             ← by block id
// `storage_path` is the S3 key (e.g. "works/sign-of-four/ch1/sc1.mp4")
// or an external https URL.
export async function POST(request: Request) {
  if (!getAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, chapter, scene, text_block_id, storage_path } = body;
  if (!storage_path) {
    return NextResponse.json(
      { error: "storage_path is required" },
      { status: 400 }
    );
  }

  // Resolve the text_block id
  let blockId = text_block_id as string | undefined;
  if (!blockId) {
    if (!slug || chapter == null || scene == null) {
      return NextResponse.json(
        { error: "Provide text_block_id OR (slug, chapter, scene)" },
        { status: 400 }
      );
    }
    const r = await db.query(
      `SELECT tb.id FROM text_blocks tb
       JOIN chapters c ON c.id = tb.chapter_id
       JOIN works w ON w.id = c.work_id
       WHERE w.slug = $1 AND c.chapter_number = $2 AND tb.block_order = $3`,
      [slug, Number(chapter), Number(scene)]
    );
    if (!r.rows.length) {
      return NextResponse.json(
        { error: `No scene found for ${slug} ch${chapter}/sc${scene}` },
        { status: 404 }
      );
    }
    blockId = r.rows[0].id;
  }

  const res = await db.query(
    `INSERT INTO video_clips (text_block_id, storage_path)
     VALUES ($1, $2)
     ON CONFLICT (text_block_id) DO UPDATE
       SET storage_path = EXCLUDED.storage_path, created_at = now()
     RETURNING text_block_id, storage_path, (xmax = 0) AS inserted`,
    [blockId, storage_path]
  );

  return NextResponse.json({ ok: true, ...res.rows[0] });
}

// DELETE /api/admin/videos?text_block_id=...  (unlink a video)
export async function DELETE(request: Request) {
  if (!getAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("text_block_id");
  if (!id) {
    return NextResponse.json(
      { error: "text_block_id required" },
      { status: 400 }
    );
  }
  await db.query("DELETE FROM video_clips WHERE text_block_id = $1", [id]);
  return NextResponse.json({ ok: true });
}
