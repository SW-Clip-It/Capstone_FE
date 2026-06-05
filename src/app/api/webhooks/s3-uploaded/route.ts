/**
 * S3 → SNS → CLIP-IT webhook
 * ─────────────────────────────────────────────────────────────
 * Receives notifications when a video is uploaded to S3 under `videos/` and
 * registers it in `video_clips`. Accepts two key shapes:
 *   - videos/{slug}/{chapter}_{scene}.mp4   (human-readable, recommended)
 *   - videos/{text_block_id}.mp4            (UUID)
 *
 * Setup flow (one-time, in AWS console):
 *   1. Create SNS topic   → e.g. `clipit-video-uploaded`
 *   2. S3 bucket → Properties → Event notifications
 *        - Event type:  s3:ObjectCreated:*
 *        - Prefix:      videos/
 *        - Suffix:      .mp4
 *        - Destination: SNS topic above
 *   3. SNS topic → Create subscription
 *        - Protocol: HTTPS
 *        - Endpoint: https://YOUR_DOMAIN/api/webhooks/s3-uploaded
 *
 * On the first delivery, SNS sends a SubscriptionConfirmation
 * message. This handler auto-confirms it by GETting the
 * SubscribeURL — no manual click required.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  // SNS sends a JSON body identified by this header
  const messageType = request.headers.get("x-amz-sns-message-type");
  const raw = await request.text();

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1) Subscription confirmation — auto-confirm by hitting SubscribeURL
  if (messageType === "SubscriptionConfirmation" && body.SubscribeURL) {
    console.log("[webhook] confirming SNS subscription:", body.TopicArn);
    await fetch(body.SubscribeURL).catch(() => {});
    return NextResponse.json({ ok: true, confirmed: true });
  }

  // 2) Actual notification
  if (messageType !== "Notification") {
    return NextResponse.json({ ignored: messageType });
  }

  // SNS wraps the S3 event as a string in body.Message
  let s3Event: any;
  try {
    s3Event = JSON.parse(body.Message);
  } catch {
    return NextResponse.json({ error: "Invalid SNS Message" }, { status: 400 });
  }

  const records = s3Event.Records || [];
  const results: Array<{ key: string; status: string; reason?: string }> = [];

  for (const rec of records) {
    if (!rec.s3?.object?.key) continue;
    const key = decodeURIComponent(
      String(rec.s3.object.key).replace(/\+/g, " ")
    );
    const size = rec.s3.object.size ?? null;

    // Resolve key → text_block. Two accepted shapes:
    //   1) videos/{slug}/{chapter}_{scene}.mp4   (human-readable, recommended)
    //   2) videos/{text_block_id}.mp4            (UUID, also accepted)
    let blockId: string | null = null;

    const human = key.match(/^videos\/([^/]+)\/.*?(\d+)\D+(\d+)\.mp4$/i);
    const uuidKey = key.match(/^videos\/([0-9a-f-]{36})\.mp4$/i);

    if (human) {
      const [, slug, chapterStr, sceneStr] = human;
      const r = await db.query(
        `SELECT tb.id FROM text_blocks tb
         JOIN chapters c ON c.id = tb.chapter_id
         JOIN works w ON w.id = c.work_id
         WHERE w.slug = $1 AND c.chapter_number = $2 AND tb.block_order = $3`,
        [slug, Number(chapterStr), Number(sceneStr)]
      );
      blockId = r.rows[0]?.id ?? null;
      if (!blockId) {
        results.push({ key, status: "skipped", reason: "no matching scene" });
        continue;
      }
    } else if (uuidKey && UUID_RE.test(uuidKey[1])) {
      const r = await db.query("SELECT id FROM text_blocks WHERE id = $1", [
        uuidKey[1],
      ]);
      blockId = r.rows[0]?.id ?? null;
      if (!blockId) {
        results.push({ key, status: "skipped", reason: "no matching block" });
        continue;
      }
    } else {
      results.push({ key, status: "skipped", reason: "filename pattern" });
      continue;
    }

    // Optional: verify the object really exists (defense against forged events)
    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
        })
      );
    } catch {
      results.push({ key, status: "skipped", reason: "head failed" });
      continue;
    }

    await db.query(
      `INSERT INTO video_clips (text_block_id, storage_path, file_size_bytes)
       VALUES ($1, $2, $3)
       ON CONFLICT (text_block_id) DO UPDATE
         SET storage_path = EXCLUDED.storage_path,
             file_size_bytes = EXCLUDED.file_size_bytes,
             created_at = NOW()`,
      [blockId, key, size]
    );
    results.push({ key, status: "registered" });
    console.log(`[webhook] registered video for block ${blockId}`);
  }

  return NextResponse.json({ processed: results.length, results });
}
