import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { db } from "@/lib/aws/db";
import { requireAdmin } from "@/lib/aws/admin-auth";

export const dynamic = "force-dynamic";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * POST /api/admin/videos/sync   { slug }
 *
 * Scans s3://<bucket>/videos/<slug>/ and registers every uploaded video into
 * `video_clips`. This is what makes AWS Console / CLI uploads show up — they
 * land in S3 but aren't in the DB until scanned (or the S3 webhook fires).
 *
 * Accepts filenames:  {chapter}_{scene}.mp4  or  {text_block_id}.mp4
 */
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let slug: string;
  try {
    slug = (await request.json()).slug;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const bucket = process.env.AWS_S3_BUCKET!;
  const prefix = `videos/${slug}/`;

  // list all objects
  const keys: { key: string; size: number }[] = [];
  let token: string | undefined;
  try {
    do {
      const res = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: token,
        })
      );
      (res.Contents ?? []).forEach((o) => {
        if (o.Key && /\.mp4$/i.test(o.Key))
          keys.push({ key: o.Key, size: o.Size ?? 0 });
      });
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
  } catch (e: any) {
    return NextResponse.json(
      { error: `S3 조회 실패: ${e.message}` },
      { status: 500 }
    );
  }

  let registered = 0;
  let skipped = 0;
  for (const { key, size } of keys) {
    // {chapter}_{scene}
    const m = key.match(/\/(\d+)\D+(\d+)\.mp4$/i);
    let blockId: string | null = null;
    if (m) {
      const r = await db.query(
        `SELECT tb.id FROM text_blocks tb
         JOIN chapters c ON c.id = tb.chapter_id
         JOIN works w ON w.id = c.work_id
         WHERE w.slug = $1 AND c.chapter_number = $2 AND tb.block_order = $3`,
        [slug, Number(m[1]), Number(m[2])]
      );
      blockId = r.rows[0]?.id ?? null;
    } else {
      const uuid = key.match(/\/([0-9a-f-]{36})\.mp4$/i);
      if (uuid) {
        const r = await db.query("SELECT id FROM text_blocks WHERE id = $1", [
          uuid[1],
        ]);
        blockId = r.rows[0]?.id ?? null;
      }
    }
    if (!blockId) {
      skipped++;
      continue;
    }
    await db.query(
      `INSERT INTO video_clips (text_block_id, storage_path, file_size_bytes)
       VALUES ($1, $2, $3)
       ON CONFLICT (text_block_id) DO UPDATE
         SET storage_path = EXCLUDED.storage_path,
             file_size_bytes = EXCLUDED.file_size_bytes, created_at = now()`,
      [blockId, key, size]
    );
    registered++;
  }

  return NextResponse.json({ ok: true, found: keys.length, registered, skipped });
}
