import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { workId: string } }
) {
  const { rows } = await db.query(
    "SELECT * FROM chapters WHERE work_id = $1 ORDER BY chapter_number",
    [params.workId]
  );
  return NextResponse.json(rows);
}
