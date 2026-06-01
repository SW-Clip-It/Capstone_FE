/**
 * GET /api/admin/text-blocks/pending
 * ────────────────────────────────────────────────────────────
 * Returns text blocks that don't have a real (S3-hosted) video yet.
 * The Video Gen server polls this (or hits it on schedule) to get
 * its work queue.
 *
 * Auth: requires header `Authorization: Bearer <ADMIN_API_KEY>`
 *       where ADMIN_API_KEY is set in CLIP-IT's `.env.local`.
 *
 * Response: array of pending blocks
 *   [
 *     {
 *       text_block_id: "...",
 *       content: "It is a truth universally acknowledged...",
 *       work_title: "Pride and Prejudice",
 *       chapter_title: "First Impressions",
 *       block_order: 1
 *     },
 *     ...
 *   ]
 *
 * The video gen server then:
 *   1. For each block, generate a video from `content`
 *   2. Upload to s3://clipit-videos-2026/blocks/<text_block_id>.mp4
 *   3. The S3 webhook above auto-registers it.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await db.query(`
    SELECT tb.id AS text_block_id,
           tb.content,
           tb.content_ko,
           tb.block_order,
           w.title AS work_title,
           w.title_ko AS work_title_ko,
           c.chapter_number,
           c.title AS chapter_title,
           c.title_ko AS chapter_title_ko
    FROM text_blocks tb
    JOIN chapters c ON c.id = tb.chapter_id
    JOIN works w ON w.id = c.work_id
    LEFT JOIN video_clips vc ON vc.text_block_id = tb.id
    WHERE vc.id IS NULL
       OR vc.storage_path LIKE 'https://%'  -- still using demo external URLs
    ORDER BY w.title, c.chapter_number, tb.block_order
  `);

  return NextResponse.json(rows);
}
