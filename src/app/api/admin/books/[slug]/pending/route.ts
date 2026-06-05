import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";
import { getAdminAuth } from "@/lib/aws/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/books/[slug]/pending
// The video team's work queue: scenes that still need a real (S3) video.
// Returns chapter/scene + the exact S3 key they should upload to.
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  if (!getAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const w = await db.query("SELECT id, slug FROM works WHERE slug = $1", [
    params.slug,
  ]);
  if (!w.rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { id: workId, slug } = w.rows[0];

  const { rows } = await db.query(
    `SELECT c.chapter_number, tb.block_order AS scene,
            tb.id AS text_block_id, tb.content
     FROM chapters c
     JOIN text_blocks tb ON tb.chapter_id = c.id
     LEFT JOIN video_clips vc ON vc.text_block_id = tb.id
     WHERE c.work_id = $1 AND vc.id IS NULL
     ORDER BY c.chapter_number, tb.block_order`,
    [workId]
  );

  const pending = rows.map((r: any) => ({
    chapter: r.chapter_number,
    scene: r.scene,
    text_block_id: r.text_block_id,
    content: r.content,
    // Human-readable S3 key, organised by book.
    storage_key: `videos/${slug}/${r.chapter_number}_${r.scene}.mp4`,
  }));

  return NextResponse.json({ slug, pending_count: pending.length, pending });
}
