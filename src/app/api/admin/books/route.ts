import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";
import { getAdminAuth } from "@/lib/aws/admin-auth";

export const dynamic = "force-dynamic";

// ── GET /api/admin/books ──────────────────────────────────────
// Lists every work with stats: chapters, scenes, videos, coverage %.
export async function GET(request: Request) {
  if (!getAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await db.query(`
    SELECT w.id, w.slug, w.title, w.title_ko, w.author, w.cover_image, w.genre,
           COUNT(DISTINCT c.id)                       AS chapters,
           COUNT(DISTINCT tb.id)                      AS scenes,
           COUNT(DISTINCT vc.text_block_id)
             FILTER (WHERE vc.storage_path NOT LIKE 'https://%') AS videos,
           COUNT(DISTINCT vc.text_block_id)           AS videos_any
    FROM works w
    LEFT JOIN chapters c   ON c.work_id = w.id
    LEFT JOIN text_blocks tb ON tb.chapter_id = c.id
    LEFT JOIN video_clips vc ON vc.text_block_id = tb.id
    GROUP BY w.id
    ORDER BY w.title
  `);

  const books = rows.map((r: any) => {
    const scenes = Number(r.scenes);
    const videos = Number(r.videos_any);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      title_ko: r.title_ko,
      author: r.author,
      cover_image: r.cover_image,
      genre: r.genre,
      chapters: Number(r.chapters),
      scenes,
      videos,
      coverage: scenes > 0 ? Math.round((videos / scenes) * 100) : 0,
    };
  });

  return NextResponse.json(books);
}

// ── POST /api/admin/books ─────────────────────────────────────
// Import / update a book.  Body:
// {
//   title, author, slug, cover_image?, title_ko?, genre?,
//   scenes: [{ chapter, scene, content, content_ko? }]   // or JSONL keys
// }
// Also accepts `jsonl`: a newline-delimited string of scene objects.
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

  const { title, author, slug, cover_image, title_ko, genre } = body;
  if (!title || !author || !slug) {
    return NextResponse.json(
      { error: "title, author, slug are required" },
      { status: 400 }
    );
  }

  // Gather scenes from either `scenes` array or `jsonl` string
  let rawScenes: any[] = [];
  if (Array.isArray(body.scenes)) rawScenes = body.scenes;
  else if (typeof body.jsonl === "string") {
    rawScenes = body.jsonl
      .split("\n")
      .filter((l: string) => l.trim())
      .map((l: string) => JSON.parse(l));
  }
  if (rawScenes.length === 0) {
    return NextResponse.json(
      { error: "No scenes provided (scenes[] or jsonl string)" },
      { status: 400 }
    );
  }

  // Normalize keys (support both {chapter,scene,content,content_ko}
  // and JSONL style {Chapter,"Scene number",Content,Content_kor})
  const scenes = rawScenes.map((s) => ({
    chapter: Number(s.chapter ?? s.Chapter),
    scene: Number(s.scene ?? s["Scene number"]),
    content: String(s.content ?? s.Content ?? ""),
    content_ko: s.content_ko ?? s.Content_kor ?? null,
  }));

  // Group by chapter
  const byChapter = new Map<number, typeof scenes>();
  for (const s of scenes) {
    if (!byChapter.has(s.chapter)) byChapter.set(s.chapter, []);
    byChapter.get(s.chapter)!.push(s);
  }
  const chapterNums = [...byChapter.keys()].sort((a, b) => a - b);

  const firstLine = (t: string) =>
    t.split("\n").map((x) => x.trim()).filter(Boolean)[0]?.slice(0, 200);

  // Upsert in a transaction-ish sequence (pg pool single calls)
  try {
    // work
    const existing = await db.query("SELECT id FROM works WHERE slug = $1", [
      slug,
    ]);
    let workId: string;
    if (existing.rows.length) {
      workId = existing.rows[0].id;
      await db.query(
        `UPDATE works SET title=$2, title_ko=$3, author=$4,
            cover_image=COALESCE($5, cover_image), genre=COALESCE($6, genre),
            total_chapters=$7, updated_at=now() WHERE id=$1`,
        [
          workId,
          title,
          title_ko ?? null,
          author,
          cover_image ?? null,
          genre ?? null,
          chapterNums.length,
        ]
      );
    } else {
      const ins = await db.query(
        `INSERT INTO works (slug, title, title_ko, author, cover_image, genre, total_chapters)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          slug,
          title,
          title_ko ?? null,
          author,
          cover_image ?? null,
          genre ?? "Mystery",
          chapterNums.length,
        ]
      );
      workId = ins.rows[0].id;
    }

    let totalScenes = 0;
    for (const chNum of chapterNums) {
      const chScenes = byChapter
        .get(chNum)!
        .sort((a, b) => a.scene - b.scene);
      const chapterTitle = firstLine(chScenes[0]?.content) || `Chapter ${chNum}`;
      const ch = await db.query(
        `INSERT INTO chapters (work_id, chapter_number, title, total_blocks)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (work_id, chapter_number) DO UPDATE
           SET title=EXCLUDED.title, total_blocks=EXCLUDED.total_blocks
         RETURNING id`,
        [workId, chNum, chapterTitle, chScenes.length]
      );
      const chapterId = ch.rows[0].id;
      for (const s of chScenes) {
        await db.query(
          `INSERT INTO text_blocks (chapter_id, block_order, content, content_ko)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (chapter_id, block_order) DO UPDATE
             SET content=EXCLUDED.content, content_ko=EXCLUDED.content_ko`,
          [chapterId, s.scene, s.content, s.content_ko]
        );
        totalScenes++;
      }
    }

    return NextResponse.json({
      ok: true,
      work_id: workId,
      slug,
      chapters: chapterNums.length,
      scenes: totalScenes,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
