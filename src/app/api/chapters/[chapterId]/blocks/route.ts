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

export async function GET(
  _request: Request,
  { params }: { params: { chapterId: string } }
) {
  const userId = getUserIdFromToken();

  const { rows: blocks } = await db.query(
    `SELECT tb.*,
            json_agg(DISTINCT vc.*) FILTER (WHERE vc.id IS NOT NULL) AS video_clips,
            CASE WHEN $2::uuid IS NULL THEN NULL
                 ELSE (SELECT row_to_json(bm) FROM (
                   SELECT id, note, created_at FROM bookmarks
                   WHERE text_block_id = tb.id AND user_id = $2
                   LIMIT 1
                 ) bm)
            END AS bookmark
     FROM text_blocks tb
     LEFT JOIN video_clips vc ON vc.text_block_id = tb.id
     WHERE tb.chapter_id = $1
     GROUP BY tb.id
     ORDER BY tb.block_order`,
    [params.chapterId, userId]
  );

  const mapped = blocks.map((b: any) => ({
    ...b,
    video_clip: b.video_clips?.[0] ?? null,
    video_clips: undefined,
  }));

  return NextResponse.json(mapped);
}
