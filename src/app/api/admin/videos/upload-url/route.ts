import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";
import { requireAdmin } from "@/lib/aws/admin-auth";
import { createUploadUrl } from "@/lib/aws/s3";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/videos/upload-url
 *
 * Returns a presigned PUT URL for uploading a video to S3 (no AWS creds needed).
 *
 * Identify the scene by EITHER:
 *   { text_block_id }                 ← stable DB id
 *   { slug, chapter, scene }          ← human key
 *
 * S3 KEY is human-readable, organised by book:
 *     videos/{slug}/{chapter}_{scene}.mp4
 *   e.g. videos/sign-of-four/1_1.mp4
 *
 * (DB mapping is still by text_block_id — resolved from the path at register.)
 */
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

  let slug: string, chapter: number, scene: number, textBlockId: string;

  if (body.text_block_id) {
    const r = await db.query(
      `SELECT w.slug, c.chapter_number, tb.block_order, tb.id
       FROM text_blocks tb
       JOIN chapters c ON c.id = tb.chapter_id
       JOIN works w ON w.id = c.work_id
       WHERE tb.id = $1`,
      [body.text_block_id]
    );
    if (!r.rows.length) {
      return NextResponse.json(
        { error: "text_block_id not found" },
        { status: 404 }
      );
    }
    slug = r.rows[0].slug;
    chapter = r.rows[0].chapter_number;
    scene = r.rows[0].block_order;
    textBlockId = r.rows[0].id;
  } else if (body.slug && body.chapter != null && body.scene != null) {
    const r = await db.query(
      `SELECT tb.id FROM text_blocks tb
       JOIN chapters c ON c.id = tb.chapter_id
       JOIN works w ON w.id = c.work_id
       WHERE w.slug = $1 AND c.chapter_number = $2 AND tb.block_order = $3`,
      [body.slug, Number(body.chapter), Number(body.scene)]
    );
    if (!r.rows.length) {
      return NextResponse.json(
        { error: `No scene for ${body.slug} ${body.chapter}_${body.scene}` },
        { status: 404 }
      );
    }
    slug = body.slug;
    chapter = Number(body.chapter);
    scene = Number(body.scene);
    textBlockId = r.rows[0].id;
  } else {
    return NextResponse.json(
      { error: "Provide text_block_id OR (slug, chapter, scene)" },
      { status: 400 }
    );
  }

  const key = `videos/${slug}/${chapter}_${scene}.mp4`;

  try {
    const uploadUrl = await createUploadUrl(key, "video/mp4", 3600);
    return NextResponse.json({
      upload_url: uploadUrl,
      storage_key: key,
      text_block_id: textBlockId,
      expires_in: 3600,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
