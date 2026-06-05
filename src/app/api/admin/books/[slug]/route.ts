import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";
import { requireAdmin } from "@/lib/aws/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/books/[slug]
// Full structure: chapters → scenes, each with video status.
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const w = await db.query(
    "SELECT id, slug, title, title_ko, author, cover_image, genre FROM works WHERE slug = $1",
    [params.slug]
  );
  if (!w.rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const work = w.rows[0];

  const { rows: scenes } = await db.query(
    `SELECT c.chapter_number, c.title AS chapter_title,
            tb.id AS text_block_id, tb.block_order AS scene,
            tb.content, tb.content_ko,
            vc.storage_path,
            (vc.id IS NOT NULL) AS has_video,
            (vc.storage_path LIKE 'https://%') AS is_external
     FROM chapters c
     JOIN text_blocks tb ON tb.chapter_id = c.id
     LEFT JOIN video_clips vc ON vc.text_block_id = tb.id
     WHERE c.work_id = $1
     ORDER BY c.chapter_number, tb.block_order`,
    [work.id]
  );

  // group by chapter
  const chapterMap = new Map<number, any>();
  for (const s of scenes as any[]) {
    if (!chapterMap.has(s.chapter_number)) {
      chapterMap.set(s.chapter_number, {
        chapter_number: s.chapter_number,
        title: s.chapter_title,
        scenes: [],
      });
    }
    chapterMap.get(s.chapter_number).scenes.push({
      text_block_id: s.text_block_id,
      scene: s.scene,
      content: s.content,
      content_ko: s.content_ko,
      storage_path: s.storage_path,
      has_video: s.has_video,
      is_external: s.is_external,
    });
  }

  return NextResponse.json({
    ...work,
    chapters: [...chapterMap.values()],
  });
}
